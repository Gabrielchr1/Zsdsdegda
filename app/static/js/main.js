    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Ajuste para a altura da navbar fixa
                const navbarHeight = document.getElementById('mainNavbar') ? document.getElementById('mainNavbar').offsetHeight : 70;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navbarHeight;
            
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Update current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    // Solar Simulator Logic with Charts
    const solarSimulatorForm = document.getElementById('solarSimulatorForm');
    const simulationResultDiv = document.getElementById('simulationResult');
    const monthlySavingsP = document.getElementById('monthlySavings');
    const annualSavingsP = document.getElementById('annualSavings');
    const systemSizeP = document.getElementById('systemSize');
    const paybackTimeP = document.getElementById('paybackTime');

    let savingsChartInstance = null;
    let investmentChartInstance = null;

    solarSimulatorForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const currentBill = parseFloat(document.getElementById('currentBill').value);
        const sunlightHours = parseFloat(document.getElementById('sunlightHours').value);
        // const roofType = document.getElementById('roofType').value; // Pode ser usado para fatores de custo

        if (isNaN(currentBill) || currentBill <= 0) {
            // Usar um modal customizado ou uma mensagem mais elegante no futuro
            const feedbackDiv = document.createElement('div');
            feedbackDiv.className = 'alert alert-danger alert-dismissible fade show mt-3';
            feedbackDiv.setAttribute('role', 'alert');
            feedbackDiv.innerHTML = `
                Por favor, insira um valor válido para sua conta de luz.
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            `;
            solarSimulatorForm.prepend(feedbackDiv); // Adiciona antes do formulário
                setTimeout(() => {
                if(feedbackDiv.parentNode) feedbackDiv.remove();
            }, 5000);
            return;
        }

        // --- Estimativas Aprimoradas ---
        const savingPercentage = 0.90; // Economia pode chegar a 90-95%
        const monthlySavings = currentBill * savingPercentage;
        const annualSavings = monthlySavings * 12;

        // Tarifa média Brasil ~R$0.85/kWh (valor exemplo, varia muito por região e concessionária)
        const averageTariff = 0.85; 
        const monthlyConsumptionKWh = currentBill / averageTariff;
        
        // Geração mensal por kWp: sunlightHours * 30 dias * Fator de Performance (0.75 a 0.85)
        // Fator de Performance considera perdas por temperatura, sombreamento, sujidade, eficiência do inversor, etc.
        const performanceFactor = 0.80; 
        const kWhPerkWpPerMonth = sunlightHours * 30 * performanceFactor;
        
        let estimatedSystemSize = monthlyConsumptionKWh / kWhPerkWpPerMonth;
        estimatedSystemSize = Math.max(1.5, estimatedSystemSize); // Tamanho mínimo prático

        // Custo do sistema: R$ 3.000 a R$ 4.500 por kWp instalado. Usaremos R$3.800 como média.
        // Este valor pode variar com tipo de telhado, complexidade, marca dos equipamentos.
        const costPerkWp = 1780;
        const totalSystemCost = estimatedSystemSize * costPerkWp;

        let paybackYears = (annualSavings > 0) ? totalSystemCost / annualSavings : Infinity;
        
        monthlySavingsP.textContent = `R$ ${monthlySavings.toFixed(2).replace('.', ',')}`;
        annualSavingsP.textContent = `R$ ${annualSavings.toFixed(2).replace('.', ',')}`;
        systemSizeP.innerHTML = `<strong>Sistema Fotovoltaico Estimado:</strong> ${estimatedSystemSize.toFixed(2).replace('.', ',')} kWp (Custo aprox. R$ ${totalSystemCost.toFixed(2).replace('.',',')})`;
        
        if (paybackYears === Infinity || paybackYears > 25) {
                paybackTimeP.textContent = `Consulte-nos!`;
        } else {
                paybackTimeP.textContent = `${paybackYears.toFixed(1).replace('.', ',')} anos`;
        }

        simulationResultDiv.classList.remove('d-none');
        
        // Scroll suave para o resultado
        const navbarHeight = document.getElementById('mainNavbar') ? document.getElementById('mainNavbar').offsetHeight : 70;
        const elementPosition = simulationResultDiv.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - navbarHeight - 20; // 20px de margem extra
    
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });

        // --- Lógica dos Gráficos ---
        const yearsProjection = 5;
        const savingsLabels = [];
        const savingsData = [];
        let cumulativeSavings = 0;
        for (let i = 1; i <= yearsProjection; i++) {
            savingsLabels.push(`Ano ${i}`);
            cumulativeSavings += annualSavings;
            savingsData.push(cumulativeSavings);
        }

        const investmentLabels = ['Investimento Inicial'];
        const investmentData = [totalSystemCost];
        const investmentSavingsData = [0]; // Economia no ponto de investimento é 0

        let accumulatedSavingsForInvestmentChart = 0;
        // Garante que o gráfico de investimento vá pelo menos até o payback ou 5 anos, limitado a 20 anos.
        const investmentChartYears = Math.min(20, Math.max(yearsProjection, Math.ceil(paybackYears) + 1, 5)); 
        for (let i = 1; i <= investmentChartYears; i++) { 
            investmentLabels.push(`Ano ${i}`);
            accumulatedSavingsForInvestmentChart += annualSavings;
            investmentSavingsData.push(accumulatedSavingsForInvestmentChart);
            investmentData.push(totalSystemCost); // Linha constante do investimento
        }


        // Gráfico de Projeção de Economia
        const savingsCtx = document.getElementById('savingsChart').getContext('2d');
        if (savingsChartInstance) {
            savingsChartInstance.destroy();
        }
        savingsChartInstance = new Chart(savingsCtx, {
            type: 'bar',
            data: {
                labels: savingsLabels,
                datasets: [{
                    label: 'Economia Acumulada (R$)',
                    data: savingsData,
                    backgroundColor: 'rgba(40, 167, 69, 0.7)',
                    borderColor: 'rgba(40, 167, 69, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { return 'R$ ' + value.toLocaleString('pt-BR'); }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            }
                        }
                    }
                }
            }
        });

        // Gráfico de Investimento vs Economia
        const investmentCtx = document.getElementById('investmentChart').getContext('2d');
        if (investmentChartInstance) {
            investmentChartInstance.destroy();
        }
        investmentChartInstance = new Chart(investmentCtx, {
            type: 'line',
            data: {
                labels: investmentLabels,
                datasets: [{
                    label: 'Investimento Inicial (R$)',
                    data: investmentData,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    fill: false,
                    tension: 0.1,
                    borderDash: [5, 5] // Linha tracejada para investimento
                }, {
                    label: 'Economia Acumulada (R$)',
                    data: investmentSavingsData,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)', // Aumentei um pouco a opacidade do fill
                    fill: true, 
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) { return 'R$ ' + value.toLocaleString('pt-BR'); }
                        }
                    }
                },
                    plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': R$ ' + context.parsed.y.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    });

    // Contact Form Handler
    const contactForm = document.getElementById('contactForm');
    const contactFormFeedback = document.getElementById('contactFormFeedback');

    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('contactName').value;
        const email = document.getElementById('contactEmail').value;
        const phone = document.getElementById('contactPhone').value;
        const message = document.getElementById('contactMessage').value;

        if (name.trim() === '' || email.trim() === '' || phone.trim() === '' || message.trim() === '') {
                contactFormFeedback.innerHTML = `<div class="alert alert-danger rounded-pill" role="alert">Por favor, preencha todos os campos obrigatórios.</div>`;
                return;
        }
        
        // Simulação de envio
        contactFormFeedback.innerHTML = `<div class="alert alert-success rounded-pill" role="alert"><i class="fas fa-check-circle me-2"></i>Obrigado, ${name}! Sua mensagem foi enviada (simulação). Entraremos em contato em breve.</div>`;
        contactForm.reset();
        document.getElementById('contactSubject').value = "Orçamento Energia Solar"; // Reseta o assunto padrão

        setTimeout(() => {
            contactFormFeedback.innerHTML = '';
        }, 7000);
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1 
    };

    const intersectionObserver = new IntersectionObserver((entries, observerInstance) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observerInstance.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => {
        intersectionObserver.observe(el);
    });

    // Active Nav Link on Scroll
    const sections = document.querySelectorAll('section[id]');
    const navLi = document.querySelectorAll('#mainNavbar .navbar-nav .nav-item');
    const mainNavbar = document.getElementById('mainNavbar'); // Cache a navbar

    function updateActiveNavLink() {
        let current = 'home'; 
        const navbarHeightCurrent = mainNavbar ? mainNavbar.offsetHeight : 70;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - navbarHeightCurrent - 20) { // Adicionado um pequeno offset
                current = section.getAttribute('id');
            }
        });

        navLi.forEach(li => {
            const link = li.querySelector('.nav-link');
            link.classList.remove('active');
            if (link.getAttribute('href').substring(1) === current) {
                link.classList.add('active');
            }
        });
    }
    window.addEventListener('scroll', updateActiveNavLink);
    window.addEventListener('load', updateActiveNavLink); 
    // Considerar um ResizeObserver para a navbar se a altura dela puder mudar dinamicamente (ex: adição de banners)
    // ou recalcular navbarHeightCurrent dentro de updateActiveNavLink se for mais simples.
