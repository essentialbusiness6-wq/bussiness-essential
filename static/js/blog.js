// blog.js - Business Essential Blog Page

document.addEventListener('DOMContentLoaded', () => {
    // Sample blog data
    const blogPosts = [
        {
            id: 1,
            title: "How to Automate Your Invoicing Process",
            excerpt: "Learn how to save hours each week by automating your invoicing workflow with smart templates and recurring billing.",
            category: "productivity",
            image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&h=400&fit=crop",
            date: "December 12, 2024",
            readTime: "5 min read"
        },
        {
            id: 2,
            title: "5 Financial Metrics Every Business Owner Should Track",
            excerpt: "Discover the key financial indicators that will help you make better business decisions and drive growth.",
            category: "finance",
            image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
            date: "December 10, 2024",
            readTime: "7 min read"
        },
        {
            id: 3,
            title: "The Future of Remote Work: Trends for 2025",
            excerpt: "Explore the emerging trends shaping remote work and how businesses can adapt to stay competitive.",
            category: "business",
            image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
            date: "December 8, 2024",
            readTime: "6 min read"
        },
        {
            id: 4,
            title: "Building a Strong Brand Identity on a Budget",
            excerpt: "Create a memorable brand without breaking the bank. Practical tips for startups and small businesses.",
            category: "marketing",
            image: "https://images.unsplash.com/photo-1561070791-2526d30994b8?w=600&h=400&fit=crop",
            date: "December 5, 2024",
            readTime: "8 min read"
        },
        {
            id: 5,
            title: "Cloud Computing: Is It Right for Your Business?",
            excerpt: "Weigh the pros and cons of cloud adoption and learn how to make the transition smoothly.",
            category: "technology",
            image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop",
            date: "December 3, 2024",
            readTime: "6 min read"
        },
        {
            id: 6,
            title: "Effective Time Management for Entrepreneurs",
            excerpt: "Master the art of prioritization and learn techniques to maximize your productivity.",
            category: "productivity",
            image: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&h=400&fit=crop",
            date: "December 1, 2024",
            readTime: "5 min read"
        },
        {
            id: 7,
            title: "Understanding Cash Flow: A Complete Guide",
            excerpt: "Learn the fundamentals of cash flow management and how to keep your business financially healthy.",
            category: "finance",
            image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=600&h=400&fit=crop",
            date: "November 28, 2024",
            readTime: "9 min read"
        },
        {
            id: 8,
            title: "Digital Marketing Strategies That Actually Work",
            excerpt: "Cut through the noise with proven digital marketing tactics that deliver real results.",
            category: "marketing",
            image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
            date: "November 25, 2024",
            readTime: "7 min read"
        },
        {
            id: 9,
            title: "Scaling Your Team: When and How to Hire",
            excerpt: "Navigate the challenges of team expansion with strategic hiring practices.",
            category: "business",
            image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop",
            date: "November 22, 2024",
            readTime: "6 min read"
        }
    ];

    // DOM Elements
    const blogGrid = document.getElementById('blogGrid');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const categoryBtns = document.querySelectorAll('.category-btn');
    const searchInput = document.getElementById('searchInput');
    const newsletterForm = document.getElementById('newsletterForm');
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.querySelector('.nav-menu');
    const particlesContainer = document.getElementById('particles');

    // State
    let currentCategory = 'all';
    let displayedPosts = 0;
    const postsPerPage = 6;

    // Initialize
    createParticles();
    renderPosts();
    setupEventListeners();

    function setupEventListeners() {
        // Mobile menu toggle
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });

        // Category filtering
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = btn.dataset.category;
                displayedPosts = 0;
                renderPosts();
            });
        });

        // Search functionality
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            displayedPosts = 0;
            renderPosts(searchTerm);
        });

        // Load more button
        loadMoreBtn.addEventListener('click', () => {
            displayedPosts += postsPerPage;
            renderPosts();
        });

        // Newsletter form
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector('input').value;
            showToast('Thanks for subscribing!', 'success');
            newsletterForm.reset();
        });
    }

    function renderPosts(searchTerm = '') {
        let filteredPosts = blogPosts;

        // Filter by category
        if (currentCategory !== 'all') {
            filteredPosts = filteredPosts.filter(post => post.category === currentCategory);
        }

        // Filter by search term
        if (searchTerm) {
            filteredPosts = filteredPosts.filter(post => 
                post.title.toLowerCase().includes(searchTerm) ||
                post.excerpt.toLowerCase().includes(searchTerm)
            );
        }

        // Get posts to display
        const postsToShow = filteredPosts.slice(0, displayedPosts + postsPerPage);

        // Render posts
        blogGrid.innerHTML = postsToShow.map(post => `
            <article class="blog-card" data-category="${post.category}">
                <div class="card-image">
                    <img src="${post.image}" alt="${post.title}">
                </div>
                <div class="card-content">
                    <div class="post-meta">
                        <span class="category">${post.category}</span>
                        <span class="date">${post.date}</span>
                        <span class="read-time">${post.readTime}</span>
                    </div>
                    <h3>${post.title}</h3>
                    <p>${post.excerpt}</p>
                    <a href="#" class="read-more">
                        Read More
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                        </svg>
                    </a>
                </div>
            </article>
        `).join('');

        // Update load more button visibility
        if (postsToShow.length >= filteredPosts.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'inline-flex';
        }
    }

    function createParticles() {
        const particleCount = 20;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            const size = Math.random() * 7 + 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            const duration = Math.random() * 10 + 15;
            const delay = Math.random() * 5;
            particle.style.animationDuration = `${duration}s`;
            particle.style.animationDelay = `${delay}s`;
            
            particle.style.opacity = `${Math.random() * 0.5 + 0.1}`;
            
            particlesContainer.appendChild(particle);
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});
