// ===============================
// OpenPlayground - Main JavaScript
// ===============================

// This file controls core UI behavior such as theme switching,
// project rendering, filtering, sorting, pagination, and contributor display.

// ===============================
// Architecture: ProjectVisibilityEngine Integration
// ===============================
// We're introducing a centralized visibility engine to handle project filtering logic.
// Phase 1: Migrate SEARCH functionality to use the engine.
// Phase 2 (future): Migrate category filtering, sorting, and pagination.
// Benefits:
// - Separation of concerns: logic vs. DOM manipulation
// - Reusability: engine can be used across multiple views
// - Testability: pure functions easier to unit test
// - Scalability: complex filters (multi-select, tags, dates) become manageable

import { ProjectVisibilityEngine } from "./core/projectVisibilityEngine.js";

// ===============================
// Theme Toggle
// ===============================

// Elements related to theme toggle (light/dark mode)
// Theme variables (will be initialized after components load)
let toggleBtn = null;
let themeIcon = null;

// Updates the theme icon based on the currently active theme
function updateThemeIcon(theme) {
    if (!themeIcon) themeIcon = document.getElementById("theme-icon");
    if (themeIcon) {
        if (theme === "dark") {
            themeIcon.className = "ri-moon-fill";
        } else {
            themeIcon.className = "ri-sun-line";
        }
    }
}

// ===============================
// Scroll to Top
// ===============================

// Button used to scroll back to the top of the page
const scrollBtn = document.getElementById("scrollToTopBtn");

// Show or hide the scroll-to-top button based on scroll position
window.addEventListener("scroll", () => {
    scrollBtn.classList.toggle("show", window.scrollY > 300);
});

// Smoothly scroll to the top when the button is clicked
scrollBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// ===============================
// Mobile Navbar
// ===============================

// Mobile navigation toggle elements
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

if (navToggle && navLinks) {
    // Toggle mobile navigation menu and update menu icon
    navToggle.addEventListener("click", () => {
        navLinks.classList.toggle("active");

        // Toggle icon
        const icon = navToggle.querySelector("i");
        if (navLinks.classList.contains("active")) {
            icon.className = "ri-close-line";
        } else {
            icon.className = "ri-menu-3-line";
        }
    });

    // Close mobile menu when a navigation link is clicked
    navLinks.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
            navToggle.querySelector("i").className = "ri-menu-3-line";
        });
    });
}

// ===============================
// Projects Logic
// ===============================

// Number of project cards displayed per page
const itemsPerPage = 9;
// Tracks the current page number for pagination
let currentPage = 1;
// Stores the currently selected project category filter
let currentCategory = "all";
// Stores the currently selected sorting option
let currentSort = "default";
// Holds all project data fetched from the projects.json file
let allProjectsData = [];

// ===============================
// Architecture: ProjectVisibilityEngine Instance
// ===============================
// This engine will progressively replace inline filtering logic.
// Currently handles: search query matching
// Future: category filters, sorting, advanced filters
let visibilityEngine = null;

// DOM Elements - will be queried after components load
let projectsContainer = null;
let paginationContainer = null;
let searchInput = null;
let sortSelect = null;
let filterBtns = null;
let surpriseBtn = null;
let clearBtn = null;

// Updates the project count displayed on category filter buttons
function updateCategoryCounts() {
    if (!allProjectsData || allProjectsData.length === 0) return;

    const counts = {};
    allProjectsData.forEach(project => {
        // Normalize category to lowercase
        const cat = project.category ? project.category.toLowerCase() : "unknown";
        counts[cat] = (counts[cat] || 0) + 1;
    });

    console.log("📊 Project Counts:", counts);

    if (!filterBtns) filterBtns = document.querySelectorAll(".filter-btn");

    filterBtns.forEach(btn => {
        const cat = btn.dataset.filter.toLowerCase();
        if (cat === "all") {
            btn.innerText = `All (${allProjectsData.length})`;
        } else {
            const count = counts[cat] || 0;
            const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1);
            btn.innerText = `${displayCat} (${count})`;
        }
    });
}

// Fetch project data from projects.json and initialize project rendering
async function fetchProjects() {
    try {
        const response = await fetch("./projects.json");
        const data = await response.json();
        allProjectsData = data;

        // Update project count in hero
        const projectCount = document.getElementById("project-count");
        if (projectCount) {
            projectCount.textContent = `${data.length}+`;
        }

        // Initialize ProjectVisibilityEngine with full data to support rendering
        visibilityEngine = new ProjectVisibilityEngine(data);

        renderProjects();
        updateCategoryCounts(); // Update counts after data is loaded
    } catch (error) {
        console.error("Error loading projects:", error);
        if (projectsContainer) {
            projectsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load projects</h3>
                    <p>Please try refreshing the page</p>
                </div>
            `;
        }
    }
}

function setupEventListeners() {
    console.log("🛠️ Setting up event listeners...");

    // Query DOM elements now that they are loaded
    projectsContainer = document.querySelector(".projects-container");
    paginationContainer = document.getElementById("pagination-controls");
    searchInput = document.getElementById("project-search");
    sortSelect = document.getElementById("project-sort");
    filterBtns = document.querySelectorAll(".filter-btn");
    surpriseBtn = document.getElementById("surprise-btn");
    clearBtn = document.getElementById("clear-filters");

    console.log(`Found ${filterBtns.length} filter buttons.`);

    // Search Input
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            if (visibilityEngine) {
                visibilityEngine.setSearchQuery(searchInput.value);
            }
            currentPage = 1;
            renderProjects();
        });
    }

    // Sort Select
    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            currentSort = sortSelect.value;
            currentPage = 1;
            renderProjects();
        });
    }

    // Filter Buttons
    if (filterBtns && filterBtns.length > 0) {
        filterBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                console.log(`🔘 Filter clicked: ${btn.dataset.filter}`);

                filterBtns.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                currentCategory = btn.dataset.filter;
                if (visibilityEngine) {
                    visibilityEngine.setCategory(currentCategory);
                }
                currentPage = 1;
                renderProjects();
            });
        });
    } else {
        console.warn("⚠️ No filter buttons found during setup!");
    }

    // Surprise Me Button
    if (surpriseBtn) {
        surpriseBtn.addEventListener("click", () => {
            if (allProjectsData.length > 0) {
                const randomIndex = Math.floor(Math.random() * allProjectsData.length);
                const randomProject = allProjectsData[randomIndex];
                // Open project link
                window.open(randomProject.link, "_self");
            }
        });
    }

    // Clear Filters Button
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (sortSelect) sortSelect.value = "default";
            currentCategory = "all";
            currentPage = 1;

            if (filterBtns) {
                filterBtns.forEach(b => b.classList.remove("active"));
                const allBtn = document.querySelector('[data-filter="all"]');
                if (allBtn) allBtn.classList.add("active");
            }

            if (visibilityEngine) {
                visibilityEngine.reset();
            }

            renderProjects();
        });
    }

    // Theme Toggle Logic
    toggleBtn = document.getElementById("toggle-mode-btn");
    themeIcon = document.getElementById("theme-icon");
    const html = document.documentElement;

    // Load previously saved theme
    const savedTheme = localStorage.getItem("theme") || "light";
    html.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const newTheme = html.getAttribute("data-theme") === "light" ? "dark" : "light";
            html.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            updateThemeIcon(newTheme);

            // Add shake animation
            toggleBtn.classList.add("shake");
            setTimeout(() => toggleBtn.classList.remove("shake"), 500);
        });
    } else {
        console.warn("⚠️ Theme toggle button not found during setup!");
    }
}

// Initialize App
function initializeApp() {
    console.log('🚀 Initializing OpenPlayground...');

    // 1. Setup Listeners first (binding UI elements)
    setupEventListeners();

    // 2. Fetch and render data
    fetchProjects();
    fetchContributors();

    console.log('🚀 OpenPlayground app initialized successfully!');
}

// Render project cards based on search text, category filter, sorting option,
// and pagination state
function renderProjects() {
    console.log("🎨 renderProjects() called - currentCategory:", currentCategory);
    if (!projectsContainer) {
        console.warn("❌ projectsContainer is NULL. Attempting dynamic query...");
        projectsContainer = document.querySelector(".projects-container");
    }

    if (!projectsContainer) {
        console.error("⛔ Still no projectsContainer! Check if .projects-container exists in index.html/projects.html");
        return;
    }

    let filteredProjects = [...allProjectsData];

    // ===============================
    // Architecture: Use ProjectVisibilityEngine for Filtering
    // ===============================
    if (visibilityEngine) {
        // The engine handles both search and category filtering
        filteredProjects = visibilityEngine.getVisibleProjects();
        console.log(`🔍 Engine Filtered: ${filteredProjects.length} items (Category: ${currentCategory})`);
    } else {
        // Fallback if engine is not initialized
        if (currentCategory !== "all") {
            filteredProjects = filteredProjects.filter(
                (p) => (p.category ? p.category.toLowerCase() : "") === currentCategory.toLowerCase()
            );
        }
    }

    // Sort projects according to the selected sorting option
    // Note: This will be migrated to the engine in Phase 2
    switch (currentSort) {
        case "az":
            filteredProjects.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case "za":
            filteredProjects.sort((a, b) => b.title.localeCompare(a.title));
            break;
        case "newest":
            filteredProjects.reverse();
            break;
    }

    // Calculate pagination values and slice project list accordingly
    const totalItems = filteredProjects.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredProjects.slice(start, start + itemsPerPage);

    // Display empty state message if no projects match the criteria
    projectsContainer.innerHTML = "";

    if (paginatedItems.length === 0) {
        projectsContainer.innerHTML = `
            <div class="empty-state">
              <div class = "empty-icon">📂</div>
                <h3>No projects found! </h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `;
        renderPagination(0);
        return;
    }

    // Render cards with stagger animation
    paginatedItems.forEach((project, index) => {
        const card = document.createElement("a");
        card.href = project.link;
        card.className = "card";
        card.setAttribute("data-category", project.category);

        // Cover style
        let coverAttr = "";
        if (project.coverClass) {
            coverAttr = `class="card-cover ${project.coverClass}"`;
        } else if (project.coverStyle) {
            coverAttr = `class="card-cover" style="${project.coverStyle}"`;
        } else {
            coverAttr = `class="card-cover"`;
        }

        // Tech stack
        const techStackHtml = project.tech.map((t) => `<span>${t}</span>`).join("");

        card.innerHTML = `
            <div ${coverAttr}><i class="${project.icon}"></i></div>
            <div class="card-content">
                <div class="card-header-flex">
                    <h3 class="card-heading">${project.title}</h3>
                    <span class="category-tag">${capitalize(
            project.category
        )}</span>
                </div>
                <p class="card-description">${project.description}</p>
                <div class="card-tech">${techStackHtml}</div>
            </div>
        `;

        // Stagger animation
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        projectsContainer.appendChild(card);

        setTimeout(() => {
            card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, index * 50);
    });

    // Render pagination controls and handle page navigation
    renderPagination(totalPages);
}

// Capitalize the first letter of a given string
function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===============================
// Pagination
// ===============================

function renderPagination(totalPages) {
    // Query container dynamically
    paginationContainer = document.getElementById("pagination-controls");
    if (!paginationContainer) return;

    paginationContainer.innerHTML = "";
    if (totalPages <= 1) return;

    const createBtn = (label, disabled, onClick, isActive = false) => {
        const btn = document.createElement("button");
        btn.className = `pagination-btn${isActive ? " active" : ""}`;
        btn.innerHTML = label;
        btn.disabled = disabled;
        btn.onclick = onClick;
        return btn;
    };

    // Create previous page navigation button
    paginationContainer.appendChild(
        createBtn('<i class="ri-arrow-left-s-line"></i>', currentPage === 1, () => {
            currentPage--;
            renderProjects();
            scrollToProjects();
        })
    );

    // Page numbers (with ellipsis for many pages)
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        paginationContainer.appendChild(
            createBtn("1", false, () => {
                currentPage = 1;
                renderProjects();
                scrollToProjects();
            })
        );
        if (startPage > 2) {
            const ellipsis = document.createElement("span");
            ellipsis.className = "pagination-btn";
            ellipsis.textContent = "...";
            ellipsis.style.cursor = "default";
            paginationContainer.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationContainer.appendChild(
            createBtn(
                i,
                false,
                () => {
                    currentPage = i;
                    renderProjects();
                    scrollToProjects();
                },
                i === currentPage
            )
        );
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement("span");
            ellipsis.className = "pagination-btn";
            ellipsis.textContent = "...";
            ellipsis.style.cursor = "default";
            paginationContainer.appendChild(ellipsis);
        }
        paginationContainer.appendChild(
            createBtn(totalPages, false, () => {
                currentPage = totalPages;
                renderProjects();
                scrollToProjects();
            })
        );
    }

    // Create next page navigation button
    paginationContainer.appendChild(
        createBtn(
            '<i class="ri-arrow-right-s-line"></i>',
            currentPage === totalPages,
            () => {
                currentPage++;
                renderProjects();
                scrollToProjects();
            }
        )
    );
}

function scrollToProjects() {
    const projectsSection = document.getElementById("projects");
    if (projectsSection) {
        projectsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// ===============================
// Hall of Contributors Logic
// ===============================

// Fetch GitHub contributors and display them in the contributors section
async function fetchContributors() {
    const contributorsGrid = document.getElementById("contributors-grid");
    if (!contributorsGrid) return;

    try {
        const response = await fetch(
            "https://api.github.com/repos/YadavAkhileshh/OpenPlayground/contributors"
        );

        if (!response.ok) {
            throw new Error("Failed to fetch contributors");
        }

        const contributors = await response.json();

        // Update contributor count in hero
        const contributorCount = document.getElementById("contributor-count");
        if (contributorCount) {
            contributorCount.textContent = `${contributors.length}+`;
        }

        contributorsGrid.innerHTML = "";

        contributors.forEach((contributor, index) => {
            const card = document.createElement("div");
            card.className = "contributor-card";

            // Determine if this is a developer (>50 contributions)
            const isDeveloper = contributor.contributions > 50;
            const badgeHTML = isDeveloper
                ? `<span class="contributor-badge developer-badge"><i class="ri-code-s-slash-line"></i> Developer</span>`
                : '';

            card.innerHTML = `
                <img src="${contributor.avatar_url}" alt="${contributor.login}" class="contributor-avatar" loading="lazy">
                <div class="contributor-info">
                    <h3 class="contributor-name">${contributor.login}</h3>
                    <div class="contributor-stats">
                        <span class="contributor-contributions">
                            <i class="ri-git-commit-line"></i> ${contributor.contributions} contributions
                        </span>
                        ${badgeHTML}
                    </div>
                </div>
                <a href="${contributor.html_url}" target="_blank" rel="noopener noreferrer" class="contributor-github-link" aria-label="View ${contributor.login} on GitHub">
                    <i class="ri-github-fill"></i>
                </a>
            `;

            // Stagger animation
            card.style.opacity = "0";
            card.style.transform = "translateY(20px)";
            contributorsGrid.appendChild(card);

            setTimeout(() => {
                card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }, index * 30);
        });
    } catch (error) {
        // Show fallback message if contributors cannot be loaded
        console.error("Error fetching contributors:", error);
        contributorsGrid.innerHTML = `
            <div class="loading-msg">
                Unable to load contributors. 
                <a href="https://github.com/YadavAkhileshh/OpenPlayground/graphs/contributors" 
                   target="_blank" 
                   style="color: var(--primary-500); text-decoration: underline;">
                   View on GitHub
                </a>
            </div>
        `;
    }
}

// ===============================
// Smooth Scroll for Anchor Links
// ===============================

// ===============================
// Initialization Logic
// ===============================

// Wait for all components to be loaded before initializing
let componentsLoaded = 0;
const totalComponents = 6;

document.addEventListener('componentLoaded', (e) => {
    componentsLoaded++;
    console.log(`✅ Component loaded: ${e.detail.component} (${componentsLoaded}/${totalComponents})`);

    if (componentsLoaded === totalComponents) {
        console.log('🎉 All components loaded! Initializing app...');
        initializeApp();
    }
});

// Fallback timeout
setTimeout(() => {
    if (componentsLoaded < totalComponents) {
        console.log('⏰ Timeout reached, initializing app anyway...');
        initializeApp();
    }
}, 3000);

// Helper for smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;
        const target = document.querySelector(targetId);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    });
});

// --- 1. Navbar Scroll Logic ---
let navbar = null;
window.addEventListener('scroll', () => {
    if (!navbar) navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// --- 2. Fade Up Animation Trigger ---
document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => {
        observer.observe(el);
    });
});