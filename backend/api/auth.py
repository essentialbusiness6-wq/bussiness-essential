from backend.api import api_bp
from flask import (
    Flask, request, jsonify, session,redirect, Blueprint,render_template,make_response
)
import hashlib
from datetime import datetime,timedelta
import secrets
import requests
import os
from backend.utils import ( 
    token_required,
    get_user_id,
    get_db,
    send_email, 
    save_log_activity,
    detect_location,
    save_security_activity,
    db_cursor,
    get_client_ip,
    get_location_from_ip,
    get_location,
    log_session_phone,
    update_session_activity
)
import jwt
import requests
import traceback
import cloudinary
import cloudinary.uploader
import cloudinary.api


# ==========================
# CONSTANTS
# ==========================
APP_LOGO_URL = "https://res.cloudinary.com/dkb987i8w/image/upload/v1772108684/app_logo_ky1yis.png"
SECURITY_URL = "https://yourapp.com/security-settings"
DASHBOARD_URL = "https://www.businessessentia.net/dashboard"
SECRET_KEY = os.getenv("SECRET_KEY")



@api_bp.route("/user", methods=["POST"])
def create_user():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "username",
        "email",
        "password",
        "security_question",
        "security_answer"
    ]

    # Validate required fields FIRST
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400
            
    conn = get_db()
    cursor = conn.cursor()
    try:
        # Check duplicate username properly
        cursor.execute(
            "SELECT 1 FROM user_base WHERE username = %s",
            (data["username"],)
        )
        if cursor.fetchone():
            return jsonify({
                "status": "error",
                "message": "Username already exists"
            }), 400

        referral_code = generate_referral_code()

        ref_code_used = data["ReferralCode"]
        cursor.execute("""
            SELECT user_id FROM referrals WHERE referral_code=%s
        """, (ref_code_used,))

        referrer = cursor.fetchone()

        if referrer:
            referred_by = ref_code_used
        else:
            referred_by = None
        # Insert user
        cursor.execute("""
            INSERT INTO user_base
            (username, email, password_hash, sequrity_question, sequrity_answer_hash,
             failed_attempts, last_login, last_failed_login, trial_ends_at,
             locked, lock_reason, active,referral_code,referred_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,%s,%s)
        """, (
            data["username"],
            data["email"],
            hashlib.sha256(data["password"].encode()).hexdigest(),
            data["security_question"],
            hashlib.sha256(data["security_answer"].encode()).hexdigest(),
            0,
            None,
            None,
            (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S"),
            False,
            "",
            True,
            referral_code,
            referred_by
        ))
        user_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO user_settings (user_id, footer_note
            )
            VALUES (%s, %s)
            """,
            (
                user_id,
                "Thanks for doing business with us."
            )
        )

        cursor.execute(
            """
            INSERT INTO wallet_base (user_id)
            VALUES(%s)
            """,
            (user_id,)
        )

        conn.commit()

        code = secrets.token_hex(3)
        session['email_code'] = code
        send_email(
            data['email'],
            "Business Essential - Verify Your Email",
            f'Your verification code is {code}',
            html=False
        )

        
        save_security_activity(
            user_id=user_id,
            type_="User",
            title="New User",
            description="User created successfully",
            severity="LOW",
            ip_address=get_client_ip()
        )

        return jsonify({
            "status": "success",
            "message": "User created successfully"
        }), 201

    except Exception as e:
        conn.rollback()
        print(e)
        return jsonify({
            "status": "error",
            "message": f"Error: {e}"
        }), 500
    finally:
        cursor.close()
        conn.close()


@api_bp.route("/verify", methods=["POST"])
def verify_user():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
       "entered_code",
        "username"
    ]

    username = data["username"]

    # Validate required fields
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    genereted_code = session.get("email_code")
    with db_cursor(dictionary=True) as (_, cursor):

        # ================= GET USER IN SAME CONNECTION =================
        cursor.execute(
            """
            SELECT user_id
            FROM user_base
            WHERE username=%s
            """,
            (username,)
        )

        user_row = cursor.fetchone()

        if not user_row:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404

        user_id = user_row["user_id"]
    
        if genereted_code != data["entered_code"]:
            save_security_activity(
                user_id=user_id,
                type_="Verification",
                title="Email verification",
                description="Email verification failed",
                severity="MEDIUM",
                ip_address=get_client_ip()
            )
            return jsonify({
                "status": "error",
                "message": "Invalid verification code"
            }), 400
    
        session.clear()
        save_security_activity(
            user_id=user_id,
            type_="Verification",
            title="Email verification",
            description="Email verified successfully",
            severity="LOW",
            ip_address=get_client_ip()
        )
        cursor.execute(
            """
            UPDATE user_base
            SET is_email_verified = %s
            WHERE user_id = %s
            """,
            (True, user_id)
        )
    return jsonify({
        "status": "success",
        "message": "User verified successfully"
    }), 200


@api_bp.route("/pin", methods=["POST"])
def add_pin():
    conn = get_db()
    cursor = conn.cursor()
    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "status": "error",
                "message": "Invalid or missing JSON"
            }), 400

        required_fields = [
           "AppPin",
            "ConfirmAppPin",
            "username",
        ]

        # Validate required fields
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    "status": "error",
                    "message": f"Missing field: {field}"
                }), 400
            
        user_id = get_user_id(data['username'])
        if not user_id:
            return jsonify({
            "status": "error",
            "message": "User not found"
            }), 404

        if data["AppPin"] != data["ConfirmAppPin"]:
            return jsonify({
            "status": "error",
            "message": "Pin didn't match each other."
            }), 404

        apppin = hashlib.sha256(data["AppPin"].encode()).hexdigest()

   
        cursor.execute(
            """
            UPDATE user_base
            SET app_pin=%s
            WHERE user_id=%s
            """,
            (apppin, user_id)
        )
        conn.commit()
        save_security_activity(
            user_id=user_id,
            type_="account",
            title="App Pin",
            description="Added app pin successfully",
            severity="LOW",
            ip_address=get_client_ip()
        )

        return jsonify({
            "status": "success",
            "message": "App Pin Added"
        }), 200
    except Exception as e:
        conn.rollback()
        print(e)
        return jsonify({
            "status": "error",
            "message": f"Error {e}",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

@api_bp.route("/resend", methods=["POST"])
def resend_verification():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "email",
        "verification_code"
    ]

    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    send_email(
        recipient=data["email"],
        subject="Verification Code Resent",
        body=f"Here is your verification code: {data['verification_code']}",
        html=False
    )

    return jsonify({
        "status": "success",
        "message": "Verification code resent successfully"
    }), 200


@api_bp.route("/cust", methods=["POST"])
def create_profile():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = [
        "username",
        "profile_name",
        "full_name",
        "address",
        "country",
        "currency",
        "dob"
    ]

    # GET USER ID FOR INDEXING
    user_id = get_user_id(data['username'])


    # lOAD DATA FROM DATABASE TO ENSURE NO DUPLICATES
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT profilename FROM cust_base")
    existing_profiles = {row[0] for row in cursor.fetchall()}
    if data["profile_name"] in existing_profiles:
        return jsonify({
            "status": "error",
            "message": "Profile name already exists"
        }), 400
    
    # Validate required fields
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    try:
        cursor.execute("""
            INSERT INTO cust_base
            (user_id,profilename, fullname, address, country, currency, dob)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            data["profile_name"],
            data["full_name"],
            data["address"],
            data["country"],
            data["currency"],
            data["dob"]
        ))

        conn.commit()
        # welcome html
        first_name = data['profile_name']
        year = datetime.now().year
        welcome_html = f"""

<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">


    <!-- Card -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="max-width:600px; background:#ffffff; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,0.08); overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg, #2563eb, #1e40af); padding:28px; text-align:center;">
          <img src="{APP_LOGO_URL}" alt="Business Essential Logo" width="56" height="56"
            style="display:block; margin:0 auto 10px;" />
          <h1 style="margin:0; font-size:22px; color:#ffffff;">Welcome to Business Essential 🎉</h1>
          <p style="margin:6px 0 0; font-size:14px; color:#dbeafe;">
            Simple • Secure • Professional Invoicing
          </p>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:36px; color:#111827;">
          <h2 style="margin-top:0; font-size:24px;">
            Hi {first_name},
          </h2>

          <p style="font-size:15px; line-height:1.7;">
            Welcome aboard! We’re excited to have you join <strong>Business Essential</strong>.
            Your account has been successfully created, and you’re now ready to start managing
            invoices, customers, and payments with ease.
          </p>

          <!-- Feature List -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr>
              <td style="font-size:15px; line-height:1.8;">
                ✅ Create and manage professional invoices<br />
                ✅ Track payments and customer activity<br />
                ✅ Secure your account with built-in protections<br />
                ✅ Access your data anytime, anywhere
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
            <tr>
              <td align="center">
                <a href="{DASHBOARD_URL}"
                  style="background:#2563eb; color:#ffffff; text-decoration:none;
                         padding:14px 26px; border-radius:10px;
                         font-size:15px; font-weight:600; display:inline-block;">
                  Go to Dashboard
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size:15px; line-height:1.7;">
            If you ever need help, our support team is always here to assist you.
            We recommend starting by completing your profile and creating your first invoice.
          </p>

          <p style="font-size:15px; line-height:1.7;">
            We’re glad you’re here — let’s build something great together 🚀
          </p>

          <p style="margin-top:32px; font-size:14px; color:#374151;">
            Warm regards,<br />
            <strong>The Business Essential Team</strong>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb; padding:18px; text-align:center; font-size:12px; color:#6b7280;">
          You’re receiving this email because you created an Business Essential account.<br />
          © {year} Business Essential. All rights reserved.
        </td>
      </tr>

    </table>

  </td>
</tr>


  </table>

</body>

"""
        send_email(
            recipient=data["email"],
            subject="Welcome to Business Essential 🎉",
            body=welcome_html,
            html=True
        )
        
        save_security_activity(
            user_id=user_id,
            type_="Profile",
            title="Profile Creation",
            description= f"Profile {data["profile_name"]} created fsuccessfully",
            severity="LOW",
            ip_address=get_client_ip()
        )

        return jsonify({
            "status": "success",
            "message": "Profile created successfully"
        }), 201

    except Exception as e:
        traceback.print_exc()
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": "Database error",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()


@api_bp.route("/completecust", methods=["POST"])
def complete_cust():
    # Since we are sending FormData, use request.form and request.files
    form = request.form
    file = request.files.get("profile_picture")

    # Required fields
    required_fields = [
        "username",
        "email",
        "profile_name",
        "phone_number",
        "alternate_email",
        "website",
        "bio"
    ]

    # Validate required fields
    for field in required_fields:
        if not form.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400

    username = form.get("username")
    user_id = get_user_id(username)

    # Example saving file
    file = request.files.get("profile_picture") 
    if file:
        filename = secure_filename(f"{user_id}_{file.filename}")  
        result = cloudinary.uploader.upload(
            file,
            folder="profile_images",
            transformation = [
                {"width":300, "height":300, "crop":"fill"}
            ],
            public_id = f"user_{user_id}",
            overwrite= True
        )
        save_path = result['secure_url']
        
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE cust_base
            SET phone=%s,
                alternateemail=%s,
                website=%s,
                profilepicurl=%s,
                bio=%s
            WHERE profilename=%s AND user_id=%s
        """, (
            form.get("phone_number"),
            form.get("alternate_email"),
            form.get("website"),
            save_path,
            form.get("bio"),
            form.get("profile_name"),
            user_id
        ))


        _ip = get_client_ip()
   
        save_security_activity(
            user_id=user_id,
            type_="Profile",
            title="Profile Created",
            description=f"New profile for {form.get("profile_name")} completed successfully",
            severity= "LOW",
            ip_address= _ip
         
        )
        return jsonify({
            "status": "success",
            "message": "Customer profile completed successfully"
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": f"Error: {e}",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()


@api_bp.route("/loginp", methods=["POST"])
def verifylogin():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400
    
    required_fields = [
        'username',
        'password'
    ]

    # Validate required fields
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400
        

    latitude = data.get("lat")
    longitude = data.get("lng")
    
    def get_client_ip(request):
        if request.headers.get("X-Forwarded-For"):
            return request.headers.get("X-Forwarded-For").split(",")[0]
        return request.remote_addr
        
    ip_address = get_client_ip(request)

    conn = get_db()
    cursor = conn.cursor(buffered=True)
    try:
        cursor.execute(
            """
            SELECT password_hash, locked, failed_attempts, last_failed_login,email,lock_reason, user_id,role,two_factor_enabled
            FROM user_base
            WHERE username=%s
            """,
            (data['username'],)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({
                "status": "error",
                "message":"User not found"
            }),400
        

        current_password = user[0]
        password = data['password']
        hashed = hashlib.sha256(password.encode()).hexdigest()
        user_id = user[6]

        if user[1]:
            save_security_activity(
                user_id=user_id,
                type_="Login",
                title="Login Failed",
                description="Login failed. Account locked!",
                severity="MEDIUM",
                ip_address=get_client_ip()
            )
            return jsonify({
                "status": "error",
                "message":  f"Account locked! Reason: {user[5]}" 
            }), 400
     
        


   
        if hashed != current_password:
            # Failed attempt
            new_attempts = user[2] + 1  
            cursor.execute(
                "UPDATE user_base SET failed_attempts=%s, last_failed_login=NOW() WHERE username=%s",
                (new_attempts, data['username']),
            )
            conn.commit()

            if new_attempts >= 3:
                cursor.execute(
                    "UPDATE user_base SET locked=1, lock_reason=%s WHERE username=%s",
                    ("Too many failed login attempts", data['username']),
                )
                conn.commit()
                save_security_activity(
                    user_id=user_id,
                    type_="Login",
                    title="Login Failed",
                    description=f"Login failed. Account locked,Too many failed login attempts",
                    severity="HIGH",
                    ip_address=get_client_ip()
                )


            save_security_activity(
                user_id=user_id,
                type_="Login",
                title="Login Failed",
                description=f"Login failed. Incorrect Password, attempts({new_attempts})",
                severity="MEDIUM",
                ip_address=get_client_ip()
            )
            return jsonify({
                "status": "error",
                "message": "Incorrect Password"
            }), 400
        

        # --- Successful login ---

        cursor.execute(
            "UPDATE user_base SET failed_attempts=0, last_login= NOW() WHERE username=%s",
            (data['username'],)
        )


        cursor.execute(
    """
    SELECT 1
    FROM wallet_base
    WHERE user_id=%s
    LIMIT 1
    """,
    (user_id,)
)

        w = cursor.fetchone()
        if not w :
            cursor.execute(
                """
                INSERT INTO wallet_base (user_id)
                VALUES(%s)
                """,
                (user_id,)
            )

        cursor.execute(
            """
            SELECT 1
            FROM user_settings
            WHERE user_id=%s
            LIMIT 1
            """,
            (user_id,)
        )
        s = cursor.fetchone()
        print("Just fetched s")
        if not s:
            cursor.execute(
                """
                INSERT INTO user_settings (user_id, footer_note)
                VALUES(%s, %s)
                """,
                (
                    user_id,
                    "Thanks for doing business with us."
                )
            )
           
            print("Just finished fetched s")

        referral_code = f"REF{user_id}{int(datetime.now().timestamp())}"
        cursor.execute(
            """
            INSERT INTO referrals (user_id,referral_code)
            VALUES(%s,%s)  
            """,
            (user_id,referral_code)
        )


            

        conn.commit()
        lat = data['lat']
        lng = data['lng']
  
        
        
        deviceinfo = data['device'] 
        device_model= deviceinfo['modelName']
        os_name = deviceinfo['osName']
        os_version = deviceinfo['osVersion']
        client_type = deviceinfo['brand']
    

        login_ip = get_client_ip(request)
        city, region, country = get_location_from_ip(login_ip)
        citys,state,counts = get_location(lat=lat,lng=lng)

        location = None

        if latitude and longitude:
            location = f"{latitude}, {longitude}"
        else:
            location = f"{city},{state},{country}."

        session_token = log_session_phone(
            user_id=user_id,
            ip_address=ip_address,
            location=location,
            latitude=latitude,
            longitude=longitude,
            device_info=deviceinfo 
        )
        session["session_token"] = session_token

        

  
    
        # --- Send login notification ---
        email = str(user[4]) if user[4] else None # type: ignore
        # Build login HTML





     
        year = datetime.now().year

        login_html = f"""

<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">


    <!-- Main Card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background:#ffffff; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.08); overflow:hidden;">

      <!-- Header -->
      <tr>
        <td style="background:#111827; padding:24px; text-align:center;">
          <img src="{APP_LOGO_URL}" alt="Business Essential Logo" width="48" height="48" style="display:block; margin:0 auto 8px;" />
          <h1 style="color:#ffffff; font-size:20px; margin:0;">Business Essential</h1>
          <p style="color:#9ca3af; margin:4px 0 0; font-size:14px;">Security Notification</p>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding:32px; color:#111827;">
          <h2 style="margin-top:0; font-size:22px;">New Sign-In Detected</h2>

          <p style="font-size:15px; line-height:1.6;">
            We noticed a new sign-in to your Invoice App account.  
            For your security, we’re letting you know whenever your account is accessed from a new device or location.
          </p>

          <!-- Details Box -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0; background:#f9fafb; border-radius:8px; padding:16px;">
            <tr>
              <td style="font-size:14px; line-height:1.8;">
                <strong>Login details</strong><br />
                <strong>IP Address:</strong> {login_ip}<br />
                <strong>Location:</strong> {citys}, {state}, {counts}<br />
                <strong>Date & Time:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br />
                <strong>Device:</strong> New or unrecognized device
              </td>
            </tr>
          </table>

          <p style="font-size:15px; line-height:1.6;">
            <strong>Was this you?</strong><br />
            If you recognize this activity, no action is required. You can safely ignore this message.
          </p>

          <p style="font-size:15px; line-height:1.6;">
            <strong>Was this not you?</strong><br />
            If you do not recognize this sign-in, we strongly recommend taking action immediately to protect your account:
          </p>

          <ul style="font-size:15px; line-height:1.6; padding-left:20px;">
            <li>Change your account password</li>
            <li>Review recent account activity</li>
            <li>Update your security questions or recovery details</li>
          </ul>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
            <tr>
              <td align="center">
                <a href="{SECURITY_URL}" style="background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 20px; border-radius:8px; font-weight:600; display:inline-block;">
                  Secure My Account
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size:14px; color:#374151; line-height:1.6;">
            If you believe your account has been compromised or need assistance, please contact our support team immediately.
          </p>

          <p style="font-size:14px; color:#6b7280; margin-top:32px;">
            Thank you for helping us keep your account secure,<br />
            <strong>The Business Essential Security Team</strong>
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f9fafb; padding:16px; text-align:center; font-size:12px; color:#6b7280;">
          This is an automated security message. Please do not reply.<br />
          © {year} Business Essential. All rights reserved.
        </td>
      </tr>

    </table>

  </td>
</tr>
```

  </table>

</body>


        """
        

        send_email(
            recipient=email,
            subject="New Sign-In Detected — Business Essential",
            body=login_html,
            html=True
        )
        save_security_activity(
            user_id=user_id,
            type_="account",
            title="User Login",
            description=f"A login into this app was noticed on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.",
            severity="LOW",
            ip_address=login_ip
        )

        
        # IF 2FA ENABLED
        if user[8]:

            session['pending_user_id'] = user[6]

            return jsonify({
                "status": "success",
                "two_factor_required": True
            }), 200


        payload = {
            "user_id": user[6],
            "role": user[7],
            "exp": datetime.utcnow() + timedelta(hours=24)
        }

        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")



        response = make_response(jsonify({
            "status": "success",
            "message": "Login successful",
            "token":token
        }))

        return response, 200

    except Exception as e:
        conn.rollback()
        print(e)
        traceback.print_exc()
        return jsonify({
            "status": "error",
            "message": "Database error",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()

@api_bp.route("/resetpass", methods=["POST"])
def reset():
    data = request.get_json()

    required_fields = ["email", "security_question", "security_answer"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"status": "error", "message": f"Missing {field}"}), 400
            
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT sequrity_question, sequrity_answer_hash, email
            FROM user_base
            WHERE email=%s
            """,
            (data['email'],)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404

        question, answer_hash, email = user
        incoming_answer_hash = hashlib.sha256(
            data['security_answer'].encode()
        ).hexdigest()
        incoming_question = data['security_question']

        if incoming_question != question or incoming_answer_hash != answer_hash:
            return jsonify({"status": "error", "message": "Invalid security details"}), 400

        reset_code = secrets.token_hex(3)
        reset_code_hash = hashlib.sha256(reset_code.encode()).hexdigest()

        reset_code_expires = datetime.utcnow() + timedelta(minutes=10)

        cursor.execute(
            "UPDATE user_base SET reset_code_hash=%s, reset_code_expires=%s WHERE email=%s",
            (reset_code_hash,reset_code_expires, email)
        )
        conn.commit()
        reset_password_html = f"""
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.08); overflow:hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background:#1558B0; padding:20px; text-align:center;">
                            <h2 style="margin:0; color:#ffffff; font-weight:600;">
                                Business Essential
                            </h2>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:30px;">
                            <h3 style="margin-top:0; color:#333333;">
                                Reset Your Password
                            </h3>

                            <p style="color:#555555; font-size:15px; line-height:1.6;">
                                We received a request to reset your password.  
                                If you didn’t make this request, you can safely ignore this email.
                            </p>

                            <p style="color:#555555; font-size:15px; line-height:1.6;">
                                Use the verification code below to reset your password:
                            </p>

                            <!-- Code box -->
                            <div style="text-align:center; margin:25px 0;">
                                <span style="display:inline-block; padding:14px 24px; font-size:20px; letter-spacing:3px; background:#f1f5ff; color:#1558B0; border-radius:6px; font-weight:600;">
                                    {reset_code}
                                </span>
                            </div>

                            <p style="color:#777777; font-size:14px; line-height:1.6;">
                                This code will expire in 10 minutes.
                            </p>

                            <p style="color:#555555; font-size:14px; line-height:1.6;">
                                Need help? Contact our support team.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f4f6f8; padding:16px; text-align:center;">
                            <p style="margin:0; color:#888888; font-size:13px;">
                                © {datetime.now().year} Business Essential. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
"""


        send_email(
            recipient=email,
            subject="Business Essential - Password Reset Code",
            body=reset_password_html,
            html=True
        )

        return jsonify({
            "status": "success",
            "message": "Reset code sent to email"
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": f"Error: {e}",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()


    
@api_bp.route("/save-password", methods=["POST"])
def savepassword():
    data = request.get_json()

    if not data:
        return jsonify({
            "status": "error",
            "message": "Invalid or missing JSON"
        }), 400

    required_fields = ["email", "entered_code", "password","confirmpassword"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({
                "status": "error",
                "message": f"Missing field: {field}"
            }), 400
        
    if data['password'] != data['confirmpassword']:
        return jsonify({
            "status": "error",
            "message": "Password doesn't match."
        }), 400

    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT reset_code_hash, reset_code_expires, email
            FROM user_base
            WHERE email=%s
            """,
            (data["email"],)
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404

        stored_hash, expires_at, email = user

        if not stored_hash or not expires_at:
            return jsonify({
                "status": "error",
                "message": "No active reset request"
            }), 400
        


        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)



        if datetime.utcnow() > expires_at:
            return jsonify({
                "status": "error",
                "message": "Reset code expired"
            }), 400

        entered_hash = hashlib.sha256(
            data["entered_code"].encode()
        ).hexdigest()
        if entered_hash != stored_hash:
            return jsonify({
                "status": "error",
                "message": "Invalid reset code"
            }), 400

        new_password_hash = hashlib.sha256(
            data["password"].encode()
        ).hexdigest()

        cursor.execute(
            """
            UPDATE user_base
            SET password_hash=%s,
                reset_code_hash=NULL,
                reset_code_expires=NULL,
                locked=0
            WHERE username=%s
            """,
            (new_password_hash, data["username"])
        )
        conn.commit()

        # Email Notification
        password_reset_success_html = f"""
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.08); overflow:hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background:#1aa251; padding:20px; text-align:center;">
                            <h2 style="margin:0; color:#ffffff; font-weight:600;">
                                Business Essential
                            </h2>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding:30px;">
                            <h3 style="margin-top:0; color:#333333;">
                                Password Reset Successful 🎉
                            </h3>

                            <p style="color:#555555; font-size:15px; line-height:1.6;">
                                Your password has been successfully reset.
                            </p>

                            <p style="color:#555555; font-size:15px; line-height:1.6;">
                                You can now log in to your account using your new password.
                            </p>

                            <!-- Login Button -->
                            <div style="text-align:center; margin:30px 0;">
                                <a href="{{LOGIN_URL}}"
                                   style="display:inline-block; padding:12px 26px; background:#1558B0; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:500; font-size:15px;">
                                    Go to Login
                                </a>
                            </div>

                            <p style="color:#777777; font-size:14px; line-height:1.6;">
                                If you did not perform this action, please contact support immediately.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background:#f4f6f8; padding:16px; text-align:center;">
                            <p style="margin:0; color:#888888; font-size:13px;">
                                © {datetime.now().year} Business Essential. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
"""
        send_email(
            recipient=email,
            subject="Business Essential - Password Reset Successful",
            body=password_reset_success_html,
            html=True
        )


        return jsonify({
            "status": "success",
            "message": "Password updated successfully"
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({
            "status": "error",
            "message": f"Error: {e}",
            "details": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()




