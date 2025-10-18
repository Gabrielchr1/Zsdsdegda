document.addEventListener("DOMContentLoaded", function() {

    // --- 2. LÓGICA PARA RECOLHER/EXPANDIR O MENU PRINCIPAL ---
    const sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", function() {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }

    // --- FUNCIONALIDADE DE CADASTRO DE CLIENTE ---
    const clientForm = document.getElementById('clientForm'); // Use o ID real do seu formulário
    if (clientForm) { // Só executa se estiver na página de cliente
        const pfTab = document.getElementById('pf-tab');
        const pjTab = document.getElementById('pj-tab');
        const pfForm = document.getElementById('form-pf');
        const pjForm = document.getElementById('form-pj');
        const clientTypeInput = document.getElementById('client_type_input');
        const namePfInput = document.getElementById('name_pf');
        const cpfInput = document.getElementById('cpf');
        const cnpjInput = document.getElementById('cnpj');
        const razaoSocialInput = document.getElementById('razao_social');

        // Garante que os elementos existem antes de adicionar listeners
        if (pfTab && pjTab && pfForm && pjForm && clientTypeInput && namePfInput && cpfInput && cnpjInput && razaoSocialInput) {
            pfTab.addEventListener('click', () => {
                pfForm.classList.remove('d-none');
                pjForm.classList.add('d-none');
                clientTypeInput.value = 'PF';
                namePfInput.name = "name";
                cpfInput.name = "cpf_cnpj";
                razaoSocialInput.name = "";
                cnpjInput.name = "";
            });

            pjTab.addEventListener('click', () => {
                pjForm.classList.remove('d-none');
                pfForm.classList.add('d-none');
                clientTypeInput.value = 'PJ';
                razaoSocialInput.name = "name";
                cnpjInput.name = "cpf_cnpj";
                namePfInput.name = "";
                cpfInput.name = "";
            });
        }

        // --- PREENCHIMENTO AUTOMÁTICO POR CEP ---
        const cepInput = document.getElementById('cep');
        if (cepInput) {
            cepInput.addEventListener('blur', function() {
                const cep = this.value.replace(/\D/g, '');
                if (cep.length === 8) {
                    fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`)
                        .then(response => response.json())
                        .then(data => {
                            if (!data.errors) {
                                // Garante que os IDs dos campos de endereço existam
                                const addressEl = document.getElementById('address');
                                const neighborhoodEl = document.getElementById('neighborhood');
                                const cityEl = document.getElementById('city');
                                const stateEl = document.getElementById('state');
                                if (addressEl) addressEl.value = data.street;
                                if (neighborhoodEl) neighborhoodEl.value = data.neighborhood;
                                if (cityEl) cityEl.value = data.city;
                                if (stateEl) stateEl.value = data.state;
                            }
                        })
                        .catch(error => console.error('Erro ao buscar CEP:', error));
                }
            });
        }

        // --- PREENCHIMENTO AUTOMÁTICO POR CNPJ ---
        // Garante que cnpjInput existe antes de adicionar listener
        if (cnpjInput && cepInput) { // Precisa do cepInput para disparar o evento
            cnpjInput.addEventListener('blur', function() {
                const cnpj = this.value.replace(/\D/g, '');
                if (cnpj.length === 14) {
                    fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
                        .then(response => response.json())
                        .then(data => {
                            if (!data.errors) {
                                const razaoSocialEl = document.getElementById('razao_social');
                                const cepEl = document.getElementById('cep'); // Referência ao campo CEP
                                if (razaoSocialEl) razaoSocialEl.value = data.razao_social;
                                if (cepEl) {
                                    cepEl.value = data.cep;
                                    // Dispara o evento de 'blur' no CEP para preencher o resto do endereço
                                    cepEl.dispatchEvent(new Event('blur'));
                                }
                            }
                        })
                        .catch(error => console.error('Erro ao buscar CNPJ:', error));
                }
            });
        }
    } // Fim do if(clientForm)


    // --- FUNCIONALIDADE DO FORMULÁRIO DE PROPOSTA (ATUALIZADO SEM PREÇO NOS ITENS) ---
    const proposalCreationForm = document.getElementById('proposalCreationForm');
    if (proposalCreationForm) {

        // --- Lógica 1: Alternar campos de consumo (kwh/brl) ---
        const consumptionRadios = document.querySelectorAll('input[name="consumption_input_type"]');
        const kwhGroup = document.getElementById('kwh-input-group');
        const brlGroup = document.getElementById('brl-input-group');

        // Garante que os elementos existem
        if (consumptionRadios.length > 0 && kwhGroup && brlGroup) {
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
            // Inicializa a visibilidade correta ao carregar a página
            const checkedRadio = document.querySelector('input[name="consumption_input_type"]:checked');
            if (checkedRadio) {
                 if (checkedRadio.value === 'kwh') {
                        kwhGroup.classList.remove('d-none');
                        brlGroup.classList.add('d-none');
                    } else {
                        brlGroup.classList.remove('d-none');
                        kwhGroup.classList.add('d-none');
                    }
            }
        }


        // --- Lógica 2: Buscar irradiação ---
        const fetchBtn = document.getElementById('fetchIrradianceBtn');
        const irradianceInput = document.getElementById('solar_irradiance');

        if (fetchBtn && irradianceInput) {
            fetchBtn.addEventListener('click', function() {
                const clientId = this.dataset.clientId;
                const spinner = this.querySelector('.spinner-border');
                const icon = this.querySelector('.fa-search-location');

                // Garante que spinner e icon existem
                if (spinner) spinner.classList.remove('d-none');
                if (icon) icon.classList.add('d-none');
                this.disabled = true;

                fetch(`/admin/get_irradiance/${clientId}`)
                    .then(response => {
                        if (!response.ok) { // Verifica se a resposta HTTP foi bem sucedida
                           throw new Error(`Erro HTTP: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.success) {
                            irradianceInput.value = data.irradiance;
                        } else {
                            // Mostra um erro mais amigável, mas mantém o técnico no console
                            alert('Erro ao buscar irradiação: ' + data.error);
                            console.error('Detalhe do erro de irradiação:', data.error);
                        }
                    })
                    .catch(error => {
                        console.error('Erro na requisição de irradiação:', error);
                        alert('Ocorreu um erro de rede ou servidor ao buscar irradiação. Verifique o console.');
                    })
                    .finally(() => {
                        if (spinner) spinner.classList.add('d-none');
                        if (icon) icon.classList.remove('d-none');
                        this.disabled = false;
                    });
            });
        }

        // --- LÓGICA 3: "CARRINHO" DE ITENS (SEM PREÇO) ---
        let proposalItems = []; // O "carrinho"
        const itemsTableBody = document.getElementById('items_table_body');
        const itemsJsonInput = document.getElementById('proposal_items_json'); // O hidden field

        // Modal elements
        const addItemModalEl = document.getElementById('addItemModal');
        const addItemModal = addItemModalEl ? new bootstrap.Modal(addItemModalEl) : null;
        const addItemBtn = document.getElementById('addItemBtn'); // Botão "Adicionar Item" *dentro* do modal

        // Função para renderizar a tabela de itens (SEM PREÇO)
        function renderItemsTable() {
            // Garante que os elementos existem
            if (!itemsTableBody || !itemsJsonInput) return;

            itemsTableBody.innerHTML = ''; // Limpa a tabela

            if (proposalItems.length === 0) {
                // Colspan agora é 3 (Produto, Qtd, Ação)
                itemsTableBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted p-4">Nenhum item adicionado.</td></tr>';
                itemsJsonInput.value = JSON.stringify([]); // Limpa o input hidden
                return;
            }

            proposalItems.forEach((item, index) => {
                // Preço e Total removidos da linha
                const row = `
                    <tr>
                        <td>
                            <strong>${item.product_name || 'Produto Desconhecido'}</strong><br>
                            <small class="text-muted">ID: ${item.product_id}</small>
                        </td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-item" data-index="${index}" title="Remover Item">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                itemsTableBody.innerHTML += row;
            });

            // Linha de "Total Investimento" foi REMOVIDA daqui

            // Atualiza o input hidden com o JSON do carrinho
            itemsJsonInput.value = JSON.stringify(proposalItems);
        }

        // Event listener para o botão "Adicionar Item" do modal (SEM PREÇO)
        if (addItemBtn && addItemModal) { // Garante que o botão e o modal existem
            addItemBtn.addEventListener('click', function() {
                const productSelect = document.getElementById('item_form_product');
                const quantityInput = document.getElementById('item_form_quantity');
                // priceInput removido

                // Validação mais robusta
                const selectedProductId = productSelect ? productSelect.value : null;
                const quantityValue = quantityInput ? parseInt(quantityInput.value, 10) : 0;

                if (!selectedProductId || !quantityValue || quantityValue <= 0) {
                    alert('Selecione um produto e insira uma quantidade válida (maior que zero).');
                    return;
                }

                const newItem = {
                    product_id: parseInt(selectedProductId, 10),
                    product_name: productSelect.options[productSelect.selectedIndex].text,
                    quantity: quantityValue
                    // unit_price removido
                };

                proposalItems.push(newItem); // Adiciona ao carrinho
                renderItemsTable(); // Atualiza a tabela

                // Reseta o formulário do modal se ele existir
                const modalForm = document.getElementById('modalItemForm');
                if (modalForm) modalForm.reset();
                addItemModal.hide();
            });
        }

        // Event listener para os botões "Remover" (usando delegação de evento)
        if (itemsTableBody) {
            itemsTableBody.addEventListener('click', function(e) {
                // Verifica se o clique foi no botão ou no ícone dentro dele
                const removeBtn = e.target.closest('.btn-remove-item');
                if (removeBtn) {
                    const indexToRemove = parseInt(removeBtn.dataset.index, 10);
                    // Verifica se o índice é válido antes de remover
                    if (!isNaN(indexToRemove) && indexToRemove >= 0 && indexToRemove < proposalItems.length) {
                        proposalItems.splice(indexToRemove, 1); // Remove do carrinho
                        renderItemsTable(); // Atualiza a tabela
                    } else {
                        console.error("Índice inválido para remover item:", removeBtn.dataset.index);
                    }
                }
            });
        }

        // Event listener para o envio do formulário principal
        proposalCreationForm.addEventListener('submit', function(e) {
            // O input hidden já está sendo atualizado pela renderItemsTable
            // Apenas validamos se o carrinho não está vazio
            if (proposalItems.length === 0) {
                e.preventDefault(); // Impede o envio
                alert('Você deve adicionar pelo menos um item à proposta antes de salvar.');
            }
            // Se houver itens, o formulário é enviado normalmente com o JSON
        });

        // Chama renderItemsTable uma vez no início para garantir que o estado inicial esteja correto
        renderItemsTable();


    } // Fim do if(proposalCreationForm)


    // --- FUNCIONALIDADE DE ADICIONAR CONCESSIONARIA (MODAL) ---
    const concessionariaModalElement = document.getElementById('addConcessionariaModal');
    if (concessionariaModalElement) {
        const concessionariaModal = new bootstrap.Modal(concessionariaModalElement);
        const concessionariaForm = document.getElementById('addConcessionariaForm');

        if (concessionariaForm) {
            concessionariaForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const formData = new FormData(concessionariaForm);
                const formAction = concessionariaForm.getAttribute('action');

                fetch(formAction, {
                    method: 'POST',
                    body: formData,
                    headers: { // Adiciona header para indicar requisição AJAX, útil no Flask
                       'X-Requested-With': 'XMLHttpRequest'
                    }
                })
                .then(response => {
                     if (!response.ok) {
                           throw new Error(`Erro HTTP: ${response.status}`);
                        }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // O select no proposal_form.html DEVE ter o id 'concessionaria'
                        const selectConcessionaria = document.getElementById('concessionaria');
                        if (selectConcessionaria) {
                            // Cria a nova opção
                            const newOption = new Option(data.name, data.id);
                            selectConcessionaria.appendChild(newOption);
                            // Seleciona a opção recém-adicionada
                            newOption.selected = true;
                            // Dispara um evento change se necessário (caso haja JS ouvindo mudanças)
                            selectConcessionaria.dispatchEvent(new Event('change'));
                        } else {
                             console.warn("Select de concessionária com id='concessionaria' não encontrado.");
                        }
                        concessionariaModal.hide();
                        concessionariaForm.reset();
                    } else {
                        // Mostra os erros de validação do formulário
                        alert('Erro ao salvar concessionária: ' + JSON.stringify(data.errors));
                        console.error('Erros de validação (Concessionária):', data.errors);
                    }
                })
                .catch(error => {
                     console.error('Erro no fetch (Concessionária):', error);
                     alert('Ocorreu um erro de rede ou servidor ao adicionar a concessionária.');
                });
            });
        }
    }


    // --- LÓGICA DE DIMENSIONAMENTO AUTOMÁTICO (REMOVIDA) ---


    // --- LÓGICA DOS GRÁFICOS DO DASHBOARD ---
    const lineChartCanvas = document.getElementById('proposalsLineChart');
    if (lineChartCanvas) { // Só executa se estiver no dashboard
        const ctxLine = lineChartCanvas.getContext('2d');
        // Verifica se Chart.js está carregado
        if (typeof Chart !== 'undefined') {
            new Chart(ctxLine, {
                type: 'line',
                data: {
                    // TODO: Idealmente, buscar esses dados do backend
                    labels: ['Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro'],
                    datasets: [{
                        label: 'Criadas', data: [5, 8, 12, 10, 15, 11], // Exemplo
                        borderColor: '#4e73df', backgroundColor: 'rgba(78, 115, 223, 0.05)',
                        fill: true, tension: 0.3
                    }, {
                        label: 'Aprovadas', data: [1, 2, 4, 3, 5, 2], // Exemplo
                        borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.05)',
                        fill: true, tension: 0.3
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true } },
                     plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: 'Propostas Criadas vs Aprovadas' }
                    }
                }
            });
        } else {
             console.error("Chart.js não está carregado. Gráfico de linha não será renderizado.");
        }

        const doughnutChartCanvas = document.getElementById('statusDoughnutChart');
        if (doughnutChartCanvas) {
            const ctxDoughnut = doughnutChartCanvas.getContext('2d');
             if (typeof Chart !== 'undefined') {
                new Chart(ctxDoughnut, {
                    type: 'doughnut',
                    data: {
                        // TODO: Idealmente, buscar esses dados do backend
                        labels: ['Em Rascunho', 'Enviadas', 'Aprovadas', 'Recusadas'],
                        datasets: [{
                            data: [5, 6, 2, 1], // Exemplo
                            backgroundColor: ['#4e73df', '#f6c23e', '#28a745', '#e74a3b'],
                            hoverOffset: 4
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                         plugins: {
                            legend: { position: 'top' },
                            title: { display: true, text: 'Status das Propostas' }
                        }
                    }
                });
             } else {
                 console.error("Chart.js não está carregado. Gráfico de rosca não será renderizado.");
             }
        }
    } // Fim do if(lineChartCanvas)

}); // Fim do DOMContentLoaded