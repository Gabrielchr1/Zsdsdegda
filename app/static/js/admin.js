document.addEventListener("DOMContentLoaded", function() {

    // --- 2. LÓGICA PARA RECOLHER/EXPANDIR O MENU PRINCIPAL ---
    const sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", function() {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }



    // --- NOVA FUNCIONALIDADE DE CADASTRO DE CLIENTE ---
    const clientTypeToggle = document.getElementById('clientTypeToggle');
    if (clientTypeToggle) {
        const pfTab = document.getElementById('pf-tab');
        const pjTab = document.getElementById('pj-tab');
        const pfForm = document.getElementById('form-pf');
        const pjForm = document.getElementById('form-pj');
        const clientTypeInput = document.getElementById('client_type_input');
        const namePfInput = document.getElementById('name_pf');
        const cpfInput = document.getElementById('cpf');
        const cnpjInput = document.getElementById('cnpj');
        const razaoSocialInput = document.getElementById('razao_social');

        pfTab.addEventListener('click', () => {
            pfForm.classList.remove('d-none');
            pjForm.classList.add('d-none');
            clientTypeInput.value = 'PF';
            // Alterna quais campos são obrigatórios para o formulário
            namePfInput.name = "name";
            cpfInput.name = "cpf_cnpj";
            razaoSocialInput.name = "";
            cnpjInput.name = "";
        });

        pjTab.addEventListener('click', () => {
            pjForm.classList.remove('d-none');
            pfForm.classList.add('d-none');
            clientTypeInput.value = 'PJ';
            // Alterna quais campos são obrigatórios para o formulário
            razaoSocialInput.name = "name";
            cnpjInput.name = "cpf_cnpj";
            namePfInput.name = "";
            cpfInput.name = "";
        });

        // --- PREENCHIMENTO AUTOMÁTICO POR CEP ---
        const cepInput = document.getElementById('cep');
        cepInput.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            if (cep.length === 8) {
                fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`)
                    .then(response => response.json())
                    .then(data => {
                        if (!data.errors) {
                            document.getElementById('logradouro').value = data.street;
                            document.getElementById('bairro').value = data.neighborhood;
                            document.getElementById('cidade').value = data.city;
                            document.getElementById('uf').value = data.state;
                        }
                    })
                    .catch(error => console.error('Erro ao buscar CEP:', error));
            }
        });

        // --- PREENCHIMENTO AUTOMÁTICO POR CNPJ ---
        cnpjInput.addEventListener('blur', function() {
            const cnpj = this.value.replace(/\D/g, '');
            if (cnpj.length === 14) {
                fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
                    .then(response => response.json())
                    .then(data => {
                        if (!data.errors) {
                            document.getElementById('razao_social').value = data.razao_social;
                            document.getElementById('cep').value = data.cep;
                            // Dispara o evento de 'blur' no CEP para preencher o resto do endereço
                            cepInput.dispatchEvent(new Event('blur'));
                        }
                    })
                    .catch(error => console.error('Erro ao buscar CNPJ:', error));
            }
        });
    }



    // --- NOVA FUNCIONALIDADE DE PROPOSTA ---
    const proposalForm = document.querySelector('form'); // Encontra o formulário na página
    if (proposalForm) {
        // Lógica para alternar campos de consumo
        const consumptionRadios = document.querySelectorAll('input[name="consumption_input_type"]');
        const kwhGroup = document.getElementById('kwh-input-group');
        const brlGroup = document.getElementById('brl-input-group');

        consumptionRadios.forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'kwh') {
                    kwhGroup.classList.remove('d-none');
                    brlGroup.classList.add('d-none');
                } else {
                    brlGroup.classList.remove('d-none');
                    kwhGroup.classList.add('d-none');
                }
            });
        });

        // Lógica para buscar irradiação
        const fetchBtn = document.getElementById('fetchIrradianceBtn');
        const irradianceInput = document.getElementById('solar_irradiance');
        
        fetchBtn.addEventListener('click', function() {
            const clientId = this.dataset.clientId;
            const spinner = this.querySelector('.spinner-border');
            const icon = this.querySelector('.fa-search-location');

            // Mostra o feedback de carregamento
            spinner.classList.remove('d-none');
            icon.classList.add('d-none');
            this.disabled = true;

            fetch(`/admin/get_irradiance/${clientId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        irradianceInput.value = data.irradiance;
                    } else {
                        alert('Erro: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Erro na requisição:', error);
                    alert('Ocorreu um erro de rede. Verifique o console para mais detalhes.');
                })
                .finally(() => {
                    // Restaura o botão ao estado normal
                    spinner.classList.add('d-none');
                    icon.classList.remove('d-none');
                    this.disabled = false;
                });
        });
    }

    
    // --- NOVA FUNCIONALIDADE DE ADICIONAR CONCESSIONARIA (MAIS ROBUSTO) ---
    const modalElement = document.getElementById('addConcessionariaModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('addConcessionariaForm');
        
        // ADICIONAMOS ESTA VERIFICAÇÃO EXTRA
        if (form) { 
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(form);
                const formAction = form.getAttribute('action');

                fetch(formAction, {
                    method: 'POST',
                    body: formData,
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const select = document.getElementById('concessionaria_select');
                        const newOption = new Option(data.name, data.id, true, true);
                        select.appendChild(newOption);
                        modal.hide();
                        form.reset();
                    } else {
                        alert('Erro ao salvar: ' + JSON.stringify(data.errors));
                    }
                })
                .catch(error => console.error('Erro:', error));
            });
        }
    }



    // --- LÓGICA DE DIMENSIONAMENTO AUTOMÁTICO (VERSÃO FINAL) ---
    const calculateBtn = document.getElementById('calculateSystemBtn');
    if (calculateBtn) {
        // Inicializa o modal de resultados do Bootstrap
        const recommendationModal = new bootstrap.Modal(document.getElementById('recommendationModal'));

        // Adiciona o "ouvinte" de evento ao botão de calcular
        calculateBtn.addEventListener('click', function() {
            
            // 1. COLETA E VALIDA OS DADOS DE ENTRADA DO FORMULÁRIO
            let consumoMensalKwh = parseFloat(document.getElementById('avg_consumption_kwh').value);
            const faturaMensalBrl = parseFloat(document.getElementById('avg_bill_brl').value);
            const tarifaKwh = parseFloat(document.getElementById('kwh_price').value);
            const irradiacao = parseFloat(document.getElementById('solar_irradiance').value);
            const potenciaPainelWp = parseInt(document.getElementById('panel_power_wp').value, 10);
            const tipoConsumo = document.querySelector('input[name="consumption_input_type"]:checked').value;

            // Se o input for em R$, estima o consumo em kWh
            if (tipoConsumo === 'brl') {
                if (!faturaMensalBrl || !tarifaKwh || tarifaKwh <= 0) {
                    alert('Para calcular a partir da fatura, preencha o "Valor Médio da Fatura" e o "Valor da Tarifa de Energia".');
                    return;
                }
                consumoMensalKwh = faturaMensalBrl / tarifaKwh;
            }

            // Validação final dos dados necessários
            if (!consumoMensalKwh || !irradiacao || !potenciaPainelWp || consumoMensalKwh <= 0 || irradiacao <= 0) {
                alert('Para calcular, preencha os campos de Consumo, Irradiação Solar e Potência do Painel.');
                return;
            }

            // 2. REALIZA OS CÁLCULOS
            const eficiencia = 0.80; // Performance Ratio do sistema (80%)
            const potenciaSistemaKwp = consumoMensalKwh / (irradiacao * 30 * eficiencia);
            const qtdPaineis = Math.ceil(potenciaSistemaKwp / (potenciaPainelWp / 1000)); // Converte Wp para kWp para o cálculo
            const inversorRecomendado = Math.round(potenciaSistemaKwp);

            // 3. PREENCHE OS CAMPOS OCULTOS DO FORMULÁRIO
            document.getElementById('system_power_kwp').value = potenciaSistemaKwp.toFixed(2);
            document.getElementById('panel_quantity').value = qtdPaineis;
            document.getElementById('recommended_inverter_kw').value = inversorRecomendado;

            // 4. PREENCHE OS RESULTADOS NO MODAL
            document.getElementById('result-system-power').innerText = `${potenciaSistemaKwp.toFixed(2)} kWp`;
            document.getElementById('result-panel-qty').innerText = `${qtdPaineis} placas de ${potenciaPainelWp} Wp`;
            document.getElementById('result-inverter').innerText = `${inversorRecomendado} kW`;
            
            // 5. EXIBE O MODAL COM OS RESULTADOS
            recommendationModal.show();
        });
    }




    // --- LÓGICA DOS GRÁFICOS DO DASHBOARD (SÓ RODA NO DASHBOARD) ---
    const lineChartCanvas = document.getElementById('proposalsLineChart');
    if (lineChartCanvas) {
        // Gráfico de Linha
        new Chart(lineChartCanvas, {
            type: 'line',
            data: {
                labels: ['Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro'],
                datasets: [{
                    label: 'Criadas', data: [5, 8, 12, 10, 15, 11],
                    borderColor: '#4e73df', backgroundColor: 'rgba(78, 115, 223, 0.05)',
                    fill: true, tension: 0.3
                }, {
                    label: 'Aprovadas', data: [1, 2, 4, 3, 5, 2],
                    borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.05)',
                    fill: true, tension: 0.3
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } }
            }
        });
        // Gráfico de Rosca
        const doughnutChartCanvas = document.getElementById('statusDoughnutChart');
        new Chart(doughnutChartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Em Rascunho', 'Enviadas', 'Aprovadas', 'Recusadas'],
                datasets: [{
                    data: [5, 6, 2, 1],
                    backgroundColor: ['#4e73df', '#f6c23e', '#28a745', '#e74a3b'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
            }
        });
    }


});