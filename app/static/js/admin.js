document.addEventListener("DOMContentLoaded", function() {

    // --- 2. LÓGICA PARA RECOLHER/EXPANDIR O MENU PRINCIPAL ---
    const sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebarToggle) {
        sidebarToggle.addEventListener("click", function() {
            document.body.classList.toggle("sidebar-collapsed");
        });
    }

    // --- FUNCIONALIDADE DE CADASTRO DE CLIENTE ---
    const clientForm = document.getElementById('clientForm'); // Assumindo que seu form de cliente tem esse ID
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

        if(pfTab) {
            pfTab.addEventListener('click', () => {
                pfForm.classList.remove('d-none');
                pjForm.classList.add('d-none');
                clientTypeInput.value = 'PF';
                namePfInput.name = "name";
                cpfInput.name = "cpf_cnpj";
                razaoSocialInput.name = "";
                cnpjInput.name = "";
            });
        }
        
        if(pjTab) {
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
        if(cepInput) {
            cepInput.addEventListener('blur', function() {
                const cep = this.value.replace(/\D/g, '');
                if (cep.length === 8) {
                    fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`)
                        .then(response => response.json())
                        .then(data => {
                            if (!data.errors) {
                                document.getElementById('address').value = data.street; // Corrigido de 'logradouro' para 'address'
                                document.getElementById('neighborhood').value = data.neighborhood; // Corrigido de 'bairro' para 'neighborhood'
                                document.getElementById('city').value = data.city; // Corrigido de 'cidade' para 'city'
                                document.getElementById('state').value = data.state; // Corrigido de 'uf' para 'state'
                            }
                        })
                        .catch(error => console.error('Erro ao buscar CEP:', error));
                }
            });
        }

        // --- PREENCHIMENTO AUTOMÁTICO POR CNPJ ---
        if(cnpjInput) {
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
    } // Fim do if(clientForm)


    // --- FUNCIONALIDADE DO FORMULÁRIO DE PROPOSTA (NOVO) ---
    const proposalCreationForm = document.getElementById('proposalCreationForm');
    if (proposalCreationForm) {

        // --- Lógica 1: Alternar campos de consumo (kwh/brl) ---
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

        // --- Lógica 2: Buscar irradiação ---
        const fetchBtn = document.getElementById('fetchIrradianceBtn');
        const irradianceInput = document.getElementById('solar_irradiance');
        
        if (fetchBtn) {
            fetchBtn.addEventListener('click', function() {
                const clientId = this.dataset.clientId;
                const spinner = this.querySelector('.spinner-border');
                const icon = this.querySelector('.fa-search-location');

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
                        spinner.classList.add('d-none');
                        icon.classList.remove('d-none');
                        this.disabled = false;
                    });
            });
        }

        // --- LÓGICA 3: "CARRINHO" DE ITENS DA PROPOSTA ---
        let proposalItems = []; // O "carrinho"
        const itemsTableBody = document.getElementById('items_table_body');
        const itemsJsonInput = document.getElementById('proposal_items_json'); // O hidden field

        // Modal elements
        const addItemModalEl = document.getElementById('addItemModal');
        const addItemModal = addItemModalEl ? new bootstrap.Modal(addItemModalEl) : null;
        const addItemBtn = document.getElementById('addItemBtn'); // Botão "Adicionar Item" *dentro* do modal

        // Função para renderizar a tabela de itens
        function renderItemsTable() {
            itemsTableBody.innerHTML = ''; // Limpa a tabela
            
            if (proposalItems.length === 0) {
                itemsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted p-4">Nenhum item adicionado.</td></tr>';
                itemsJsonInput.value = JSON.stringify([]); // Limpa o input hidden
                return;
            }

            let totalGeral = 0;
            
            proposalItems.forEach((item, index) => {
                const totalItem = item.quantity * item.unit_price;
                totalGeral += totalItem;

                const row = `
                    <tr>
                        <td>
                            <strong>${item.product_name}</strong><br>
                            <small class="text-muted">ID: ${item.product_id}</small>
                        </td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">R$ ${item.unit_price.toFixed(2).replace('.', ',')}</td>
                        <td class="text-end"><strong>R$ ${totalItem.toFixed(2).replace('.', ',')}</strong></td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-outline-danger btn-remove-item" data-index="${index}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                itemsTableBody.innerHTML += row;
            });

            // Adiciona linha de total
            itemsTableBody.innerHTML += `
                <tr class="table-light">
                    <td colspan="3" class="text-end"><strong>Total Investimento:</strong></td>
                    <td class="text-end"><strong>R$ ${totalGeral.toFixed(2).replace('.', ',')}</strong></td>
                    <td></td>
                </tr>
            `;
            
            // Atualiza o input hidden com o JSON do carrinho
            itemsJsonInput.value = JSON.stringify(proposalItems);
        }

        // Event listener para o botão "Adicionar Item" do modal
        if (addItemBtn) {
            addItemBtn.addEventListener('click', function() {
                const productSelect = document.getElementById('item_form_product');
                const quantityInput = document.getElementById('item_form_quantity');
                const priceInput = document.getElementById('item_form_unit_price');

                // Validação
                if (!productSelect.value || !quantityInput.value || quantityInput.value <= 0 || !priceInput.value || priceInput.value < 0) {
                    alert('Preencha todos os campos do item com valores válidos.');
                    return;
                }

                const newItem = {
                    product_id: parseInt(productSelect.value, 10),
                    product_name: productSelect.options[productSelect.selectedIndex].text,
                    quantity: parseInt(quantityInput.value, 10),
                    unit_price: parseFloat(priceInput.value)
                };

                proposalItems.push(newItem); // Adiciona ao carrinho
                renderItemsTable(); // Atualiza a tabela
                
                document.getElementById('modalItemForm').reset(); // Limpa o formulário do modal
                addItemModal.hide();
            });
        }

        // Event listener para os botões "Remover" (usando delegação de evento)
        if (itemsTableBody) {
            itemsTableBody.addEventListener('click', function(e) {
                const removeBtn = e.target.closest('.btn-remove-item');
                if (removeBtn) {
                    const indexToRemove = parseInt(removeBtn.dataset.index, 10);
                    proposalItems.splice(indexToRemove, 1); // Remove do carrinho
                    renderItemsTable(); // Atualiza a tabela
                }
            });
        }

        // Event listener para o envio do formulário principal
        proposalCreationForm.addEventListener('submit', function(e) {
            // O input hidden já está atualizado
            // Apenas validamos se o carrinho não está vazio
            if (proposalItems.length === 0) {
                e.preventDefault(); // Impede o envio
                alert('Você deve adicionar pelo menos um item à proposta antes de salvar.');
            }
            // Se houver itens, o formulário é enviado normalmente com o JSON
        });

    } // Fim do if(proposalCreationForm)


    // --- FUNCIONALIDADE DE ADICIONAR CONCESSIONARIA (MODAL) ---
    const modalElement = document.getElementById('addConcessionariaModal');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        const form = document.getElementById('addConcessionariaForm');
        
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
                        // Assumindo que o select no proposal_form.html tem o id 'concessionaria'
                        const select = document.getElementById('concessionaria');
                        if (select) {
                            const newOption = new Option(data.name, data.id, true, true);
                            select.appendChild(newOption);
                        }
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

    
    // --- LÓGICA DE DIMENSIONAMENTO AUTOMÁTICO (REMOVIDA) ---
    // A seção 'calculateSystemBtn' foi removida pois os cálculos
    // agora são feitos no backend com base nos itens.


    // --- LÓGICA DOS GRÁFICOS DO DASHBOARD ---
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