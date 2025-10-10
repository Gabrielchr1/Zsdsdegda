document.addEventListener('DOMContentLoaded', () => {

    // ===============================================
    // ============= LÓGICA DO SIMULADOR =============
    // ===============================================
    const form = document.getElementById('solar-simulator-form');
    const steps = Array.from(form.querySelectorAll('.step'));
    const progressSteps = Array.from(document.querySelectorAll('.step-progress'));
    const nextButtons = form.querySelectorAll('.btn-next');
    const restartButton = form.querySelector('.btn-restart');
    
    const optionCardsContainer = document.getElementById('tipo-sistema-cards');
    const hiddenInputTipoSistema = document.getElementById('tipo-sistema');
    
    let economyChartInstance;
    let profitChartInstance; 

    // Lógica para os cards de tipo de imóvel
    optionCardsContainer.addEventListener('click', (e) => {
        const clickedCard = e.target.closest('.option-card');
        if (clickedCard) {
            optionCardsContainer.querySelector('.active').classList.remove('active');
            clickedCard.classList.add('active');
            hiddenInputTipoSistema.value = clickedCard.dataset.value;
        }
    });

    let currentStep = 0;

    const showStep = (stepIndex) => {
        steps.forEach((step, index) => step.classList.toggle('active', index === stepIndex));
        currentStep = stepIndex;
        progressSteps.forEach((step, index) => step.classList.toggle('active', index <= currentStep));
    };

    nextButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (e.target.closest('button').type === 'submit') return;
            
            const currentStepInputs = steps[currentStep].querySelectorAll('input[required]');
            let isValid = true;
            currentStepInputs.forEach(input => {
                if (!input.checkValidity()) {
                    input.reportValidity();
                    isValid = false;
                }
            });

            if (isValid) {
                showStep(currentStep + 1);
            }
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        document.getElementById('resultado-nome').textContent = nome;

        // --- Cálculos ---
        const gastoLuz = parseFloat(document.getElementById('gasto-luz').value);
        const custoKwh = 0.95, irradiacaoSolar = 5, eficienciaSistema = 0.85, potenciaPlaca = 550, custoInstalacaoPorWp = 3.80;
        const consumoMensalKwh = gastoLuz / custoKwh;
        const potenciaSistemaWp = ((consumoMensalKwh / 30) / (irradiacaoSolar * eficienciaSistema)) * 1000;
        const numeroPlacas = Math.ceil(potenciaSistemaWp / potenciaPlaca);
        const custoTotalSistema = potenciaSistemaWp * custoInstalacaoPorWp;
        const economiaAnual = (gastoLuz * 12) * 0.95;
        const tempoRetornoAnos = custoTotalSistema / economiaAnual;
        const novaConta = gastoLuz * 0.05;

        // --- Exibição dos Resultados Numéricos ---
        document.getElementById('resultado-simulacao').innerHTML = `
            <div class="result-card">
                <div class="result-card-icon"><i class="fas fa-percentage"></i></div>
                <div class="result-card-info"><h3>Redução na Conta</h3><p>Até 95%</p></div>
            </div>
            <div class="result-card">
                <div class="result-card-icon"><i class="fas fa-bolt"></i></div>
                <div class="result-card-info"><h3>Produção Mensal</h3><p>${consumoMensalKwh.toFixed(0)} kWh</p></div>
            </div>
            <div class="result-card">
                <div class="result-card-icon"><i class="fas fa-piggy-bank"></i></div>
                <div class="result-card-info"><h3>Economia Anual</h3><p>${economiaAnual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
            </div>
            <div class="result-card">
                <div class="result-card-icon"><i class="fas fa-calendar-check"></i></div>
                <div class="result-card-info"><h3>Retorno (Payback)</h3><p>${tempoRetornoAnos.toFixed(1)} anos</p></div>
            </div>
            <div class="result-card">
                 <div class="result-card-icon"><i class="fas fa-solar-panel"></i></div>
                <div class="result-card-info"><h3>Nº de Placas</h3><p>~ ${numeroPlacas}</p></div>
            </div>`;
        
        // --- Chamada das Funções de Gráficos ---
        createProfitChart(custoTotalSistema, economiaAnual);
        createEconomyChart(gastoLuz, novaConta);
        
        showStep(steps.length - 1);
    });
    
    restartButton.addEventListener('click', () => {
        form.reset();
        optionCardsContainer.querySelector('.active').classList.remove('active');
        optionCardsContainer.querySelector('[data-value="residencial"]').classList.add('active');
        showStep(0);
    });


    // ==========================================================
    // ============= FUNÇÕES DE GRÁFICOS (CHART.JS) =============
    // ==========================================================

    function createEconomyChart(oldBill, newBill) {
        const ctx = document.getElementById('economyChart').getContext('2d');
        if (economyChartInstance) {
            economyChartInstance.destroy();
        }
        economyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Sua Conta Antiga', 'Sua Nova Conta'],
                datasets: [{
                    label: 'Gasto Mensal (R$)',
                    data: [oldBill, newBill],
                    backgroundColor: ['rgba(255, 159, 64, 0.5)', 'rgba(75, 192, 192, 0.5)'],
                    borderColor: ['rgba(255, 159, 64, 1)', 'rgba(75, 192, 192, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Gasto: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => 'R$ ' + value
                        }
                    }
                }
            }
        });
    }

    // NOVA VERSÃO DA FUNÇÃO PARA O GRÁFICO DE "ONDAS"
    function createProfitChart(investment, annualSavings) {
        const ctx = document.getElementById('profitChart').getContext('2d');
        const totalYears = 15;
        const labels = Array.from({ length: totalYears }, (_, i) => `Ano ${i + 1}`);
        const cumulativeData = [];
        let cumulativeValue = -investment;

        for (let i = 0; i < totalYears; i++) {
            cumulativeValue += annualSavings;
            cumulativeData.push(cumulativeValue);
        }

        if (profitChartInstance) {
            profitChartInstance.destroy();
        }

        // Criando o preenchimento em degradê
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(253, 148, 7, 0.6)');
        gradient.addColorStop(1, 'rgba(253, 148, 7, 0.1)');

        profitChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Lucro Acumulado (R$)',
                    data: cumulativeData,
                    borderColor: '#fd9407',
                    backgroundColor: gradient, // Aplicando o degradê aqui
                    fill: true, // Essencial para criar o gráfico de área
                    tension: 0.4, // Controla a suavidade da "onda"
                    borderWidth: 3,
                    pointRadius: 0, // Pontos ficam invisíveis
                    pointHitRadius: 10, // Área de clique para o tooltip
                    pointHoverRadius: 6, // Ponto aparece ao passar o mouse
                    pointHoverBackgroundColor: '#fd9407',
                    pointHoverBorderColor: 'white'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                         callbacks: {
                            label: (context) => `Lucro Acumulado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => 'R$ ' + (value/1000) + 'k'
                        }
                    },
                     x: {
                        grid: {
                            display: false // Remove as linhas de grade verticais para um visual mais limpo
                        }
                    }
                }
            }
        });
    }

// ==========================================================
// ============= FUNÇÃO REUTILIZÁVEL P/ CARROSSÉIS (VERSÃO FINAL CORRIGIDA) ==========
// ==========================================================
function setupCarousel(carouselId, config = {}) {
    const defaultConfig = {
        visibleSlidesDesktop: 1,
        visibleSlidesTablet: 1,
        visibleSlidesMobile: 1,
        gap: 50,
    };
    const options = { ...defaultConfig, ...config };

    const root = document.getElementById(carouselId);
    if (!root) return;

    const slider = root.querySelector('.carousel-slider');
    const track = root.querySelector('.carousel-track');
    const prevBtn = root.querySelector('.prev');
    const nextBtn = root.querySelector('.next');
    const dotsNav = root.querySelector('.carousel-dots');
    if (!track || !slider) return;

    const originals = Array.from(track.children);
    const realCount = originals.length;

    const numClones = Math.max(options.visibleSlidesDesktop, options.visibleSlidesTablet, options.visibleSlidesMobile) + 1;
    const clonesToPrepend = [];
    const clonesToAppend = [];

    for (let i = 0; i < numClones; i++) {
        clonesToAppend.push(originals[i % realCount].cloneNode(true));
        clonesToPrepend.push(originals[realCount - 1 - (i % realCount)].cloneNode(true));
    }

    clonesToPrepend.reverse().forEach(clone => track.prepend(clone));
    clonesToAppend.forEach(clone => track.append(clone));

    let slides = Array.from(track.children);
    let index = numClones;
    let slideWidth = 0;
    let currentTranslate = 0;
    let isAnimating = false;
    let isDragging = false;
    let startX = 0;
    let dragOffset = 0;

    function getSlidesToDisplay() {
        if (window.innerWidth >= 1024) return options.visibleSlidesDesktop;
        if (window.innerWidth >= 768) return options.visibleSlidesTablet;
        return options.visibleSlidesMobile;
    }

    function calculateAndApplyWidths() {
        const slidesToDisplay = getSlidesToDisplay();

        if (realCount <= slidesToDisplay) {
            if (prevBtn) prevBtn.style.display = 'none';
            if (nextBtn) nextBtn.style.display = 'none';
            if (dotsNav) dotsNav.style.display = 'none';
            track.style.justifyContent = 'center';
        } else {
            if (prevBtn) prevBtn.style.display = 'flex';
            if (nextBtn) nextBtn.style.display = 'flex';
            if (dotsNav) dotsNav.style.display = 'flex';
            track.style.justifyContent = 'flex-start';
        }

        const viewportWidth = slider.clientWidth;
        const totalGapWidth = options.gap * (slidesToDisplay - 1);
        const totalUsableWidth = viewportWidth - totalGapWidth;
        slideWidth = totalUsableWidth / slidesToDisplay;

        slides.forEach(slide => {
            slide.style.width = `${slideWidth}px`;
            slide.style.marginRight = `${options.gap}px`;
        });

        track.style.marginRight = `-${options.gap}px`;
    }

    function setTransform(x, animate = true) {
        track.style.transition = animate ? 'transform 0.45s cubic-bezier(0.4,0,0.2,1)' : 'none';
        track.style.transform = `translateX(${x}px)`;
    }

    function updatePosition(animate = true) {
        currentTranslate = -index * (slideWidth + options.gap);
        setTransform(currentTranslate, animate);
    }

    function goTo(i) {
        if (isAnimating) return;
        isAnimating = true;
        index = i;
        updatePosition(true);
    }

    track.addEventListener('transitionend', () => {
        isAnimating = false;
        if (index < numClones) {
            index = index + realCount;
            updatePosition(false);
        } else if (index >= realCount + numClones) {
            index = index - realCount;
            updatePosition(false);
        }
        updateDots();
    });

    if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));
    if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));

    function updateDots() {
        if (!dotsNav) return;
        dotsNav.innerHTML = '';
        const normalizedIndex = index - numClones;
        const activeDotIndex = (normalizedIndex % realCount + realCount) % realCount;

        for (let i = 0; i < realCount; i++) {
            const dot = document.createElement('button');
            dot.className = 'dot' + (i === activeDotIndex ? ' active' : '');
            dot.addEventListener('click', () => goTo(i + numClones));
            dotsNav.appendChild(dot);
        }
    }

    slider.addEventListener('pointerdown', (e) => {
        isDragging = true;
        startX = e.clientX;
        track.style.transition = 'none'; // Desabilita a transição durante o arrasto
        slider.setPointerCapture(e.pointerId);
    });

    slider.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        dragOffset = e.clientX - startX;
        setTransform(currentTranslate + dragOffset, false);
    });

    // <-- ALTERAÇÃO PRINCIPAL ESTÁ AQUI
    function finishDrag() {
        if (!isDragging) return;
        isDragging = false;
        
        const threshold = slideWidth * 0.2;
        if (Math.abs(dragOffset) > threshold) {
            // A chamada para goTo() agora funcionará, pois 'isAnimating' não está 'true' ainda.
            // A própria função goTo se encarregará de definir isAnimating = true.
            goTo(dragOffset < 0 ? index + 1 : index - 1);
        } else {
            // Se não arrastou o suficiente, apenas anima de volta para a posição original
            updatePosition(true);
        }
        dragOffset = 0;
    }

    slider.addEventListener('pointerup', finishDrag);
    slider.addEventListener('pointercancel', finishDrag);
    slider.addEventListener('pointerleave', finishDrag); // Garante que a ação termine se o mouse sair do slider
    slider.addEventListener('dragstart', (e) => e.preventDefault());


    function init() {
        slides = Array.from(track.children);
        calculateAndApplyWidths();
        updatePosition(false);
        updateDots();
    }
    
    window.addEventListener('resize', () => {
        clearTimeout(window.resizeTimer);
        window.resizeTimer = setTimeout(init, 100);
    });

    let images = track.querySelectorAll('img');
    if (images.length === 0) {
        init();
    } else {
        let loaded = 0;
        const totalImages = images.length;
        images.forEach(img => {
            if (img.complete) {
                loaded++;
            } else {
                img.addEventListener('load', () => {
                    loaded++;
                    if (loaded === totalImages) init();
                });
                img.addEventListener('error', () => {
                    loaded++;
                    if (loaded === totalImages) init();
                });
            }
        });
        if (loaded === totalImages) init();
    }
}


// ==========================================================
// =============== INICIALIZAÇÃO DOS COMPONENTES ============
// ==========================================================
// ESTA PARTE ESTÁ CORRETA, NÃO MUDE NADA AQUI!
setupCarousel('projects-carousel', { 
    visibleSlidesDesktop: 3,
    visibleSlidesTablet: 1,  // Sugestão: 2 para tablets fica bom
    visibleSlidesMobile: 1,
    gap: 20
});
setupCarousel('testimonials-carousel', {
    visibleSlidesDesktop: 4,
    visibleSlidesTablet: 1, // Sugestão: 2 para tablets
    visibleSlidesMobile: 1,
    gap: 20
});





});