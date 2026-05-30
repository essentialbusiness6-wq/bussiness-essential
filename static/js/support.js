// support.js - Business Essential Support Page

document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // DOM ELEMENTS
    // =========================

    const backButton = document.getElementById('backButton');
    const helpBtn = document.getElementById('helpBtn');
    const faqSearch = document.getElementById('faqSearch');
    const faqList = document.getElementById('faqList');

    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const closeChat = document.getElementById('closeChat');

    const chatInput = document.getElementById('chatInput');
    const sendMessage = document.getElementById('sendMessage');
    const chatBody = document.getElementById('chatBody');

    const ticketForm = document.getElementById('ticketForm');
    const submitTicket = document.getElementById('submitTicket');

    const particlesContainer = document.getElementById('particles');

    // =========================
    // SOCKET.IO
    // =========================

const socket = io("http://127.0.0.1:5000", {
    withCredentials: true,
    transports: ["websocket", "polling"]
});

    // Generate room ID
    const roomId = `support_room_${Date.now()}`;

    socket.emit("join_support_room", {
        room_id: roomId
    });

    // =========================
    // INITIALIZE
    // =========================

    createParticles();
    setupFAQ();
    setupChatWidget();
    setupTicketForm();
    setupNavigation();
    loadTickets();

    // =========================
    // NAVIGATION
    // =========================

    function setupNavigation() {

        backButton.addEventListener('click', () => {

            showHapticFeedback(backButton);

            setTimeout(() => {

                backButton.classList.remove('haptic-feedback');

                window.history.back();

            }, 200);

        });

        helpBtn.addEventListener('click', () => {

            showHapticFeedback(helpBtn);

            setTimeout(() => {

                helpBtn.classList.remove('haptic-feedback');

                showToast(
                    '🎧 Opening help documentation...'
                );
                window.location.href = '/support';

            }, 200);

        });

    }

    // =========================
    // FAQ
    // =========================

    function setupFAQ() {

        document.querySelectorAll('.faq-question')
            .forEach(btn => {

                btn.addEventListener('click', () => {

                    showHapticFeedback(btn);

                    const item = btn.parentElement;

                    const isActive =
                        item.classList.contains('active');

                    document.querySelectorAll('.faq-item')
                        .forEach(i => {
                            i.classList.remove('active');
                        });

                    if (!isActive) {
                        item.classList.add('active');
                    }

                });

            });

        faqSearch.addEventListener('input', (e) => {

            const query =
                e.target.value.toLowerCase().trim();

            document.querySelectorAll('.faq-item')
                .forEach(item => {

                    const searchData =
                        item.dataset.search || '';

                    const question =
                        item.querySelector('.faq-question span')
                            .textContent
                            .toLowerCase();

                    const answer =
                        item.querySelector('.faq-answer')
                            .textContent
                            .toLowerCase();

                    const matches =
                        searchData.includes(query) ||
                        question.includes(query) ||
                        answer.includes(query);

                    item.classList.toggle(
                        'hidden',
                        !matches
                    );

                });

        });

    }

    // =========================
    // CHAT
    // =========================

    function setupChatWidget() {

        chatToggle.addEventListener('click', () => {

            showHapticFeedback(chatToggle);

            chatWindow.classList.toggle('active');

            chatToggle.style.display =
                chatWindow.classList.contains('active')
                    ? 'none'
                    : 'flex';

            if (chatWindow.classList.contains('active')) {
                chatInput.focus();
            }

        });

        closeChat.addEventListener('click', () => {

            chatWindow.classList.remove('active');

            chatToggle.style.display = 'flex';

        });

        function addMessage(text, type) {

            const msg = document.createElement('div');

            msg.className = `message ${type}`;

            msg.innerHTML = `
                <p>${text}</p>
                <span class="time">
                    ${new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </span>
            `;

            chatBody.appendChild(msg);

            chatBody.scrollTop =
                chatBody.scrollHeight;

        }

        function addTypingIndicator() {

            const typing = document.createElement('div');

            typing.className =
                'message system typing-indicator';

            typing.id = 'typingIndicator';

            typing.innerHTML = `
                <p>🤖 AI is typing...</p>
            `;

            chatBody.appendChild(typing);

            chatBody.scrollTop =
                chatBody.scrollHeight;

        }

        function removeTypingIndicator() {

            const typing =
                document.getElementById(
                    'typingIndicator'
                );

            if (typing) {
                typing.remove();
            }

        }

        function handleSend() {

            const text = chatInput.value.trim();

            if (!text) return;

            // ADD USER MESSAGE
            addMessage(text, 'user');

            // CLEAR INPUT
            chatInput.value = '';

            // SHOW TYPING
            addTypingIndicator();

            // SEND TO SERVER
            socket.emit("send_support_message", {
                room_id: roomId,
                message: text
            });

        }

        // SEND BUTTON
        sendMessage.addEventListener(
            'click',
            handleSend
        );

        // ENTER KEY
        chatInput.addEventListener(
            'keypress',
            (e) => {

                if (e.key === 'Enter') {
                    handleSend();
                }

            }
        );

        // RECEIVE MESSAGES
        socket.on(
            "receive_support_message",
            (data) => {

                removeTypingIndicator();

                if (data.sender === "user") {
                    return;
                }

                addMessage(
                    data.message,
                    data.sender === "ai"
                        ? "system"
                        : data.sender
                );

            }
        );

        // SYSTEM MESSAGE
        socket.on(
            "system_message",
            (data) => {

                addMessage(
                    data.message,
                    "system"
                );

            }
        );

        // SOCKET ERRORS
        socket.on(
            "connect_error",
            () => {

                showToast(
                    "❌ Chat connection failed",
                    "error"
                );

            }
        );

    }

    // =========================
    // TICKET FORM
    // =========================

    function setupTicketForm() {

        ticketForm.addEventListener(
            'submit',
            async (e) => {

                e.preventDefault();

                const category =
                    document.getElementById(
                        "ticketCategory"
                    ).value;

                const subject =
                    document.getElementById(
                        "ticketSubject"
                    ).value;

                const message =
                    document.getElementById(
                        "ticketMessage"
                    ).value;

                if (!category) {

                    showToast(
                        '⚠️ Please select a category',
                        'warning'
                    );

                    return;

                }

                const btnText =
                    submitTicket.querySelector(
                        '.btn-text'
                    );

                const btnLoader =
                    submitTicket.querySelector(
                        '.btn-loader'
                    );

                submitTicket.disabled = true;

                btnText.style.display = 'none';

                btnLoader.style.display =
                    'inline-block';

                try {

                    const response =
                        await fetch(
                            "/api/support/ticket",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                credentials: "include",

                                body: JSON.stringify({
                                    category,
                                    subject,
                                    message
                                })
                            }
                        );

                    const data =
                        await response.json();

                    if (!response.ok) {

                        throw new Error(
                            data.message ||
                            "Failed to submit"
                        );

                    }

                    showToast(
                        '✅ Ticket submitted successfully!',
                        'success'
                    );

                    ticketForm.reset();

                    loadTickets();

                } catch (error) {

                    console.error(error);

                    showToast(
                        '❌ Failed to submit ticket',
                        'error'
                    );

                } finally {

                    submitTicket.disabled = false;

                    btnText.style.display = 'inline';

                    btnLoader.style.display = 'none';

                }

            }
        );

    }

    // =========================
    // LOAD TICKETS
    // =========================

    async function loadTickets() {

        try {

            const response =
                await fetch(
                    "/api/support/my-tickets",
                    {
                        credentials: "include"
                    }
                );

            const tickets =
                await response.json();

            const ticketsList =
                document.getElementById(
                    "ticketsList"
                );

            if (!ticketsList) return;

            ticketsList.innerHTML = "";

            if (tickets.length === 0) {

                ticketsList.innerHTML = `
                    <div class="empty-state">
                        No support tickets yet.
                    </div>
                `;

                return;

            }

            tickets.forEach(ticket => {

                ticketsList.innerHTML += `
                    <div class="feedback-item">

                        <div class="feedback-header">

                            <span class="badge">
                                ${ticket.category}
                            </span>

                            <span class="
                                status
                                ${ticket.status}
                            ">
                                ${ticket.status}
                            </span>

                        </div>

                        <h4 class="feedback-title">
                            ${ticket.subject}
                        </h4>

                        <p class="feedback-date">
                            ${new Date(
                                ticket.created_at
                            ).toLocaleString()}
                        </p>

                    </div>
                `;

            });

        } catch (error) {

            console.error(error);

        }

    }

    // =========================
    // PARTICLES
    // =========================

    function createParticles() {

        const count =
            window.innerWidth > 768
                ? 25
                : 15;

        for (let i = 0; i < count; i++) {

            const p =
                document.createElement('div');

            p.className = 'particle';

            p.style.cssText = `
                width: ${Math.random() * 6 + 3}px;
                height: ${Math.random() * 6 + 3}px;
                left: ${Math.random() * 100}%;
                top: ${Math.random() * 100}%;
                animation-duration:
                    ${Math.random() * 10 + 15}s;
                animation-delay:
                    ${Math.random() * 5}s;
                opacity:
                    ${Math.random() * 0.5 + 0.1};
            `;

            particlesContainer.appendChild(p);

        }

    }

    // =========================
    // TOAST
    // =========================

    function showToast(
        message,
        type = 'info'
    ) {

        const existing =
            document.querySelector('.toast');

        if (existing) {
            existing.remove();
        }

        const toast =
            document.createElement('div');

        toast.className =
            `toast ${type}`;

        toast.innerHTML = `
            ${message}
        `;

        document.body.appendChild(toast);

        setTimeout(() => {

            toast.style.transform =
                'translateX(-50%) translateY(0)';

        }, 10);

        setTimeout(() => {

            toast.style.transform =
                'translateX(-50%) translateY(100px)';

            toast.style.opacity = '0';

            setTimeout(
                () => toast.remove(),
                300
            );

        }, 2800);

    }

    // =========================
    // HAPTIC
    // =========================

    function showHapticFeedback(el) {

        if (!el) return;

        el.classList.add(
            'haptic-feedback'
        );

        setTimeout(() => {

            el.classList.remove(
                'haptic-feedback'
            );

        }, 200);

    }

    // =========================
    // EXTRA CSS
    // =========================

    const style =
        document.createElement('style');

    style.innerHTML = `

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }

        @keyframes haptic {

            0% {
                transform: translateX(0);
            }

            25% {
                transform: translateX(-2px);
            }

            50% {
                transform: translateX(2px);
            }

            75% {
                transform: translateX(-2px);
            }

            100% {
                transform: translateX(0);
            }
        }

        .haptic-feedback {
            animation:
                haptic 0.15s ease-in-out;
        }

    `;

    document.head.appendChild(style);

});