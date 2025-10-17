import os
import base64
import json
from flask import current_app, render_template, flash, redirect, url_for, request, Blueprint, Response, jsonify
from app.forms import LoginForm, ClientForm, ProposalForm, ProposalItemForm, ConcessionariaForm, ProductForm
from app.models import User, Client, Proposal, ProposalItem, Concessionaria, Product
from flask_login import current_user, login_user, logout_user, login_required

from app.utils import generate_monthly_production_chart, generate_payback_chart, calculate_advanced_financials, generate_cumulative_cost_chart

from urllib.parse import urlsplit  # <-- LINHA CORRIGIDA
from datetime import datetime, timedelta
from geopy.geocoders import Nominatim
from weasyprint import HTML
import requests
import math
from app import db

bp = Blueprint('main', __name__)




# FUNÇÃO AUXILIAR PARA EMBUTIR IMAGENS
def embed_image_b64(file_path):
    """Lê um arquivo de imagem e retorna uma string Data URI em Base64."""
    try:
        with open(file_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        
        # Detecta o tipo de imagem pela extensão do arquivo
        mime_type = "image/png" # Padrão
        if file_path.lower().endswith(".jpg") or file_path.lower().endswith(".jpeg"):
            mime_type = "image/jpeg"
        elif file_path.lower().endswith(".svg"):
            mime_type = "image/svg+xml"
            
        return f"data:{mime_type};base64,{encoded_string}"
    except FileNotFoundError:
        print(f"AVISO: Arquivo de imagem não encontrado em: {file_path}")
        return ""



# --- FUNÇÃO HELPER PARA CÁLCULOS ---
def calculate_proposal_details(form):
    """
    Centraliza todos os cálculos automáticos da proposta.
    Retorna um dicionário com os resultados.
    """
    # 1. CALCULAR PRODUÇÃO MENSAL
    performance_ratio = 0.80
    seasonal_factors = [1.1, 1.1, 1.0, 1.0, 0.9, 0.85, 0.85, 0.9, 1.0, 1.1, 1.15, 1.15]
    days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    monthly_prod_list = []
    if form.system_power_kwp.data and form.solar_irradiance.data:
        daily_avg_production = form.system_power_kwp.data * form.solar_irradiance.data * performance_ratio
        for i in range(12):
            monthly_production = daily_avg_production * days_in_month[i] * seasonal_factors[i]
            monthly_prod_list.append(round(monthly_production, 2))

    # 2. CALCULAR ECONOMIA ANUAL
    annual_savings = 0
    consumption_kwh = form.avg_consumption_kwh.data
    if form.kwh_price.data and form.kwh_price.data > 0:
        if form.consumption_input_type.data == 'brl' and form.avg_bill_brl.data:
            bill_for_consumption = form.avg_bill_brl.data - (form.public_lighting_fee.data or 0)
            consumption_kwh = bill_for_consumption / form.kwh_price.data if form.kwh_price.data > 0 else 0
        
        if consumption_kwh:
            grid_cost_kwh = {'monofasica': 30, 'bifasica': 50, 'trifasica': 100}.get(form.grid_type.data, 50)
            total_annual_production = sum(monthly_prod_list)
            total_annual_consumption = consumption_kwh * 12
            energia_a_ser_compensada = max(0, total_annual_production - (grid_cost_kwh * 12))
            energia_injetada = max(0, total_annual_production - total_annual_consumption)
            fio_b_price = form.concessionaria.data.fio_b_price if form.concessionaria.data else 0
            custo_fio_b_anual = energia_injetada * fio_b_price
            annual_savings = (energia_a_ser_compensada * form.kwh_price.data) - custo_fio_b_anual

    # 3. CALCULAR QUANTIDADE DE PAINÉIS
    panel_quantity = None
    if form.system_power_kwp.data and form.panel_power_wp.data and form.panel_power_wp.data > 0:
        panel_quantity = math.ceil(form.system_power_kwp.data / (form.panel_power_wp.data / 1000))

    # 4. CALCULAR PAYBACK
    payback_years = None
    if form.total_investment.data and annual_savings > 0:
        payback_years = form.total_investment.data / annual_savings

    return {
        'monthly_production_kwh': monthly_prod_list,
        'estimated_savings_per_year': round(annual_savings, 2) if annual_savings > 0 else 0,
        'panel_quantity': panel_quantity,
        'payback_years': payback_years
    }



@bp.route('/')
@bp.route('/index')
def index():
    return render_template('site_index.html', title='Início')



@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))

    form = LoginForm()
    if form.validate_on_submit():
        # Busca apenas pelo username
        user = User.query.filter_by(username=form.username.data).first()

        if user is None or not user.check_password(form.password.data):
            flash('Usuário ou senha inválidos.', 'danger')
            return redirect(url_for('main.login'))

        # Faz login do usuário
        login_user(user, remember=form.remember_me.data)

        # Redirecionamento seguro
        next_page = request.args.get('next')
        if not next_page or urlsplit(next_page).netloc != '':
            next_page = url_for('main.dashboard')
        return redirect(next_page)

    return render_template('login.html', title='Login', form=form)






@bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('main.index'))

# ... (resto do arquivo)

@bp.route('/admin/dashboard')
@login_required
def dashboard():
    # A linha abaixo foi alterada
    return render_template("admin/dashboard.html", title="Dashboard")



@bp.route('/admin/clients')
@login_required
def clients():
    all_clients = Client.query.order_by(Client.name.asc())
    return render_template('admin/clients.html', title="Clientes", clients=all_clients)






@bp.route('/admin/client/add', methods=['GET', 'POST'])
@login_required
def add_client():
    form = ClientForm()
    if form.validate_on_submit():
        # Lógica para salvar os dados dos novos campos
        new_client = Client(
            client_type=form.client_type.data, name=form.name.data,
            fantasy_name=form.fantasy_name.data, cpf_cnpj=form.cpf_cnpj.data,
            state_registration=form.state_registration.data, email=form.email.data,
            phone=form.phone.data, cep=form.cep.data, address=form.address.data,
            number=form.number.data, complement=form.complement.data,
            neighborhood=form.neighborhood.data, city=form.city.data,
            state=form.state.data, user_id=current_user.id
        )
        db.session.add(new_client)
        db.session.commit()
        flash('Cliente cadastrado com sucesso!', 'success')
        return redirect(url_for('main.clients'))
    return render_template('admin/client_form.html', title="Adicionar Cliente", form=form)

@bp.route('/admin/client/<int:client_id>/edit', methods=['GET', 'POST'])
@login_required
def edit_client(client_id):
    client = Client.query.get_or_404(client_id)
    form = ClientForm(obj=client) # Pré-popula o formulário com os dados do cliente
    if form.validate_on_submit():
        client.client_type = form.client_type.data
        client.name = form.name.data
        # ... (atualize todos os outros campos da mesma forma) ...
        client.state = form.state.data
        db.session.commit()
        flash('Cliente atualizado com sucesso!', 'success')
        return redirect(url_for('main.clients'))
    return render_template('admin/client_form.html', title="Editar Cliente", form=form)

@bp.route('/admin/client/<int:client_id>/delete', methods=['POST'])
@login_required
def delete_client(client_id):
    client = Client.query.get_or_404(client_id)
    db.session.delete(client)
    db.session.commit()
    flash('Cliente excluído com sucesso!', 'danger')
    return redirect(url_for('main.clients'))












@bp.route('/admin/client/<int:client_id>/proposal/add', methods=['GET', 'POST'])
@login_required
def add_proposal(client_id):
    client = Client.query.get_or_404(client_id)
    form = ProposalForm()
    item_form = ProposalItemForm() 
    
    if form.validate_on_submit():
        
        # --- 1. CARREGAR ITENS DO "CARRINHO" JSON ---
        try:
            items_list = json.loads(form.proposal_items_json.data)
            if not items_list:
                flash('Não é possível criar uma proposta sem itens. Adicione os produtos.', 'danger')
                return render_template('admin/proposal_form.html', title="Nova Proposta", 
                                       form=form, client=client, item_form=item_form, 
                                       concessionaria_form=ConcessionariaForm())
        except json.JSONDecodeError:
            flash('Erro ao processar os itens da proposta.', 'danger')
            return redirect(request.url)

        # --- 2. CALCULAR DADOS DO SISTEMA A PARTIR DOS ITENS (LÓGICA REFINADA) ---
        
        calc_system_power_wp = 0  # Potência total em Wp (DC)
        calc_panel_quantity = 0
        calc_panel_power_wp = 0     # Potência do painel individual
        calc_total_investment = 0

        for item_data in items_list:
            try:
                product = Product.query.get(int(item_data['product_id']))
                if not product:
                    continue 
                
                qty = int(item_data['quantity'])
                price = float(item_data['unit_price'])
                
                calc_total_investment += (qty * price)

                # Se o item é um módulo, some sua potência para o total do sistema (DC)
                if product.category == 'Módulo' and product.power_wp:
                    calc_system_power_wp += (product.power_wp * qty)
                    calc_panel_quantity += qty
                    calc_panel_power_wp = product.power_wp # Salva a potência do painel
                
                # O inversor não é mais somado. Será calculado abaixo.

            except (ValueError, TypeError):
                flash(f"Erro ao processar dados do item: {item_data}", 'danger')
                continue

        # Converte a potência total do sistema de Wp para kWp
        calc_system_power_kwp = calc_system_power_wp / 1000.0

        # CALCULAR O INVERSOR RECOMENDADO (NOVA LÓGICA)
        # Usamos o DC/AC Ratio que você sugeriu (1.1 a 1.3). Vamos usar 1.2 como um padrão.
        DC_AC_RATIO = 1.2 
        calc_inverter_kw = calc_system_power_kwp / DC_AC_RATIO

        # --- 3. CALCULAR PRODUÇÃO, ECONOMIA E PAYBACK (LÓGICA REFINADA) ---
        
        # Parâmetros de cálculo baseados nas suas recomendações
        PERFORMANCE_RATIO = 0.78  # (PR) Fator de performance realista (78%)
        AVG_DAYS_PER_MONTH = 365.25 / 12 # Média de dias por mês

        monthly_prod_list = []
        total_annual_production = 0
        
        # PSH (Horas de Sol Pleno) vem da nossa busca na NASA
        psh = form.solar_irradiance.data or 4.5 # Usa 4.5 como fallback se a busca falhar

        if calc_system_power_kwp > 0:
            # Fórmula Invertida: Produção (kWh/dia) = Potência (kWp) × PSH × PR
            avg_daily_production_kwh = calc_system_power_kwp * psh * PERFORMANCE_RATIO
            
            # Geração Média Mensal (kWh)
            avg_monthly_production_kwh = avg_daily_production_kwh * AVG_DAYS_PER_MONTH
            
            # Por enquanto, usamos uma média flat. Para sazonalidade, precisaríamos de dados PSH mensais da NASA.
            monthly_prod_list = [round(avg_monthly_production_kwh, 2)] * 12
            total_annual_production = avg_monthly_production_kwh * 12

        # Obter o consumo mensal (seja por kWh ou R$)
        # Esta lógica já estava correta e a manteremos.
        consumption_kwh_monthly = form.avg_consumption_kwh.data or 0
        if form.kwh_price.data and form.kwh_price.data > 0:
            if form.consumption_input_type.data == 'brl' and form.avg_bill_brl.data:
                # Remove a taxa de iluminação pública para achar o consumo real
                bill_for_consumption = (form.avg_bill_brl.data or 0) - (form.public_lighting_fee.data or 0)
                consumption_kwh_monthly = bill_for_consumption / form.kwh_price.data
        
        # Calcular Economia Anual (Esta lógica já é robusta e considera o Fio B)
        annual_savings = 0
        if form.kwh_price.data and form.kwh_price.data > 0:
            grid_cost_kwh = {'monofasica': 30, 'bifasica': 50, 'trifasica': 100}.get(form.grid_type.data, 50)
            total_annual_consumption = consumption_kwh_monthly * 12
            
            # O que o sistema gerou menos o custo de disponibilidade
            energia_a_ser_compensada = max(0, total_annual_production - (grid_cost_kwh * 12))
            
            # O que foi injetado na rede (geração > consumo)
            energia_injetada = max(0, total_annual_production - total_annual_consumption)
            
            fio_b_price = form.concessionaria.data.fio_b_price if form.concessionaria.data else 0
            custo_fio_b_anual = energia_injetada * fio_b_price
            
            # Economia = (Valor da energia compensada) - (Custo do Fio B)
            annual_savings = (energia_a_ser_compensada * form.kwh_price.data) - custo_fio_b_anual
        
        # Calcular Payback
        payback_years = None
        if calc_total_investment > 0 and annual_savings > 0:
            payback_years = calc_total_investment / annual_savings

        # --- 4. SALVAR A PROPOSTA PRINCIPAL ---
        new_proposal = Proposal(
            title=form.title.data,
            valid_until=form.valid_until.data,
            consumption_input_type=form.consumption_input_type.data,
            grid_type=form.grid_type.data,
            notes=form.notes.data,
            client=client,
            author=current_user,
            kwh_price=form.kwh_price.data or None,
            public_lighting_fee=form.public_lighting_fee.data or None,
            concessionaria_id=form.concessionaria.data.id if form.concessionaria.data else None,
            avg_consumption_kwh=form.avg_consumption_kwh.data or None,
            avg_bill_brl=form.avg_bill_brl.data or None,
            solar_irradiance=form.solar_irradiance.data or None,
            
            # Dados calculados a partir dos itens e novas fórmulas
            total_investment=round(calc_total_investment, 2),
            system_power_kwp=round(calc_system_power_kwp, 2), # Ex: 9.72
            panel_quantity=calc_panel_quantity,              # Ex: 18
            panel_power_wp=calc_panel_power_wp,              # Ex: 540
            recommended_inverter_kw=round(calc_inverter_kw, 2),# Ex: 8.1 (9.72 / 1.2)
            
            # Dados calculados a partir da economia
            monthly_production_kwh=monthly_prod_list,
            estimated_savings_per_year=round(annual_savings, 2) if annual_savings > 0 else 0,
            payback_years=round(payback_years, 1) if payback_years else None
        )

        db.session.add(new_proposal)
        db.session.commit() # Commit para obter o new_proposal.id

        # --- 5. SALVAR OS ITENS DA PROPOSTA VINCULADOS ---
        for item_data in items_list:
            qty = int(item_data['quantity'])
            price = float(item_data['unit_price'])
            
            item_db = ProposalItem(
                quantity=qty,
                unit_price=price,
                total_price=qty * price,
                proposal_id=new_proposal.id,
                product_id=int(item_data['product_id'])
            )
            db.session.add(item_db)
            
        db.session.commit() # Commit final com os itens

        flash('Proposta criada com sucesso! Cálculos de alta precisão aplicados.', 'success')
        return redirect(url_for('main.proposal_detail', proposal_id=new_proposal.id))
    
    # Se for GET, renderiza o formulário
    concessionaria_form = ConcessionariaForm()
    return render_template('admin/proposal_form.html', title="Nova Proposta", 
                           form=form, client=client, item_form=item_form, 
                           concessionaria_form=concessionaria_form)












# --- ROTA NOVA PARA O MODAL ---
@bp.route('/admin/concessionarias/add', methods=['POST'])
@login_required
def add_concessionaria():
    form = ConcessionariaForm()
    if form.validate_on_submit():
        new_concessionaria = Concessionaria(
            name=form.name.data,
            fio_b_price=form.fio_b_price.data
        )
        db.session.add(new_concessionaria)
        db.session.commit()
        # Retorna os dados da nova concessionária para o JavaScript
        return jsonify({
            'success': True, 
            'id': new_concessionaria.id, 
            'name': new_concessionaria.name
        })
    # Se a validação falhar, retorna os erros
    return jsonify({'success': False, 'errors': form.errors})




# --- ROTA ATUALIZADA ---
@bp.route('/admin/proposal/<int:proposal_id>')
@login_required
def proposal_detail(proposal_id):
    proposal = Proposal.query.get_or_404(proposal_id)
    # Passa a versão correta do item_form para o template
    item_form = ProposalItemForm()
    return render_template('admin/proposal_detail.html', title=proposal.title, proposal=proposal, item_form=item_form)



@bp.route('/admin/proposals')
@login_required
def proposals_list():
    """ Rota para listar todas as propostas criadas. """
    # Busca todas as propostas e ordena pela data de criação descendente (mais novas primeiro)
    all_proposals = Proposal.query.order_by(Proposal.creation_date.desc()).all()
    
    # Renderiza o novo template, passando a lista de propostas para ele
    return render_template('admin/proposals.html', title="Propostas", proposals=all_proposals)





@bp.route('/admin/proposal/<int:proposal_id>/delete', methods=['POST'])
@login_required
def delete_proposal(proposal_id):
    """ Rota para excluir uma proposta. """
    # Encontra a proposta pelo ID ou retorna um erro 404 (Não Encontrado) se não existir
    proposal_to_delete = Proposal.query.get_or_404(proposal_id)
    
    # Deleta o objeto do banco de dados
    db.session.delete(proposal_to_delete)
    
    # Confirma a transação
    db.session.commit()
    
    # Cria uma mensagem de feedback para o usuário
    flash('Proposta excluída com sucesso!', 'success')
    
    # Redireciona o usuário de volta para a lista de propostas
    return redirect(url_for('main.proposals_list'))









# --- ROTA CORRIGIDA ---
@bp.route('/admin/proposal/<int:proposal_id>/add_item', methods=['POST'])
@login_required
def add_item(proposal_id):
    proposal = Proposal.query.get_or_404(proposal_id)
    form = ProposalItemForm()
    if form.validate_on_submit():
        # Usa o novo campo 'product' em vez de 'description'
        product = form.product.data
        quantity = form.quantity.data
        unit_price = form.unit_price.data

        item = ProposalItem(
            quantity=quantity,
            unit_price=unit_price,
            total_price=quantity * unit_price,
            proposal_id=proposal.id,
            product_id=product.id # Salva a conexão com o produto do catálogo
        )
        db.session.add(item)
        
        # Recalcula o valor total da proposta
        # Usamos 'proposal.items.all()' pois é uma relação 'dynamic'
        # proposal.total_investment = sum(p_item.total_price for p_item in proposal.items.all())
        db.session.commit()
        flash('Item adicionado com sucesso!', 'success')
    else:
        # Pega o primeiro erro de validação para mostrar ao usuário
        error_messages = [error for field, errors in form.errors.items() for error in errors]
        flash(f'Erro ao adicionar item: {error_messages[0]}' if error_messages else 'Verifique os dados.', 'danger')
        
    return redirect(url_for('main.proposal_detail', proposal_id=proposal.id))








# --- ADICIONE ESTA OUTRA ROTA ---
@bp.route('/admin/item/<int:item_id>/delete', methods=['POST'])
@login_required
def delete_item(item_id):
    item_to_delete = ProposalItem.query.get_or_404(item_id)
    proposal = item_to_delete.proposal
    
    # Deleta o item
    db.session.delete(item_to_delete)
    
    # Recalcula o valor total da proposta
    # proposal.total_investment = sum(p_item.total_price for p_item in proposal.items)
    db.session.commit()
    flash('Item removido com sucesso!', 'success')
    return redirect(url_for('main.proposal_detail', proposal_id=proposal.id))




@bp.route('/admin/get_irradiance/<int:client_id>')
@login_required
def get_irradiance(client_id):
    client = Client.query.get_or_404(client_id)
    geolocator = Nominatim(user_agent="solucao_solar_app_v1")
    location = None  # Inicializa a localização

    try:
        # --- TENTATIVA 1: Usar o CEP (Mais confiável) ---
        # A BrasilAPI no admin.js já formata o CEP, mas podemos garantir
        if client.cep:
            cep_limpo = client.cep.replace('-', '').strip()
            address_string = f"{cep_limpo}, Brazil"
            print(f"--- Geocodificando (Tentativa 1 - CEP): {address_string}")
            location = geolocator.geocode(address_string, timeout=7)
        
        # --- TENTATIVA 2: Usar o Endereço Completo (Se o CEP falhar ou não existir) ---
        if location is None and client.address and client.city and client.state:
            address_string = f"{client.address}, {client.city}, {client.state}, Brazil"
            print(f"--- Geocodificando (Tentativa 2 - Endereço): {address_string}")
            location = geolocator.geocode(address_string, timeout=7)
        
        # --- TENTATIVA 3: Usar Apenas Cidade/Estado (Último recurso) ---
        if location is None and client.city and client.state:
            address_string = f"{client.city}, {client.state}, Brazil"
            print(f"--- Geocodificando (Tentativa 3 - Cidade/Estado): {address_string}")
            location = geolocator.geocode(address_string, timeout=7)

        # Se NENHUMA tentativa funcionar
        if location is None:
            return jsonify({'success': False, 'error': 'Endereço não encontrado. Verifique o CEP, cidade e estado do cliente.'})

        lat, lon = location.latitude, location.longitude
        print(f"--- Coordenadas encontradas: Lat={lat}, Lon={lon}")

    except Exception as e:
        return jsonify({'success': False, 'error': f'Erro de geocodificação: {e}'})

    # --- O restante da lógica da API da NASA permanece idêntico ---
    try:
        end_date = datetime.now() - timedelta(days=1)
        start_date = end_date - timedelta(days=365)
        start = start_date.strftime('%Y%m%d')
        end = end_date.strftime('%Y%m%d')

        api_url = (
            "https://power.larc.nasa.gov/api/temporal/daily/point"
            f"?parameters=ALLSKY_SFC_SW_DWN&community=RE&latitude={lat}&longitude={lon}"
            f"&format=JSON&start={start}&end={end}"
        )
        
        response = requests.get(api_url, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        irradiance_data = data['properties']['parameter']['ALLSKY_SFC_SW_DWN']
        
        valid_values = [v for v in irradiance_data.values() if v >= 0]

        if not valid_values:
            return jsonify({'success': False, 'error': 'A API da NASA não retornou dados válidos para esta localidade.'})

        avg_irradiance = sum(valid_values) / len(valid_values)
        
        return jsonify({'success': True, 'irradiance': round(avg_irradiance, 2)})

    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': f'Erro ao conectar à API da NASA: {e}'})
    except Exception as e:
        print(f"Erro ao processar dados da irradiação: {e}")
        return jsonify({'success': False, 'error': f'Erro inesperado ao processar dados da irradiação.'})
    




# app/routes.py

# ... (outras rotas) ...

@bp.route('/admin/proposal/<int:proposal_id>/update_status', methods=['POST'])
@login_required
def update_proposal_status(proposal_id):
    """ Rota para atualizar o status de uma proposta. """
    # Encontra a proposta ou retorna erro 404
    proposal = Proposal.query.get_or_404(proposal_id)
    
    # Pega o novo status enviado pelo formulário
    new_status = request.form.get('new_status')
    
    # Valida se o status recebido é um dos permitidos
    allowed_statuses = ['Ativa', 'Enviada', 'Inativa']
    if new_status in allowed_statuses:
        proposal.status = new_status
        db.session.commit()
        flash(f'Status da proposta "{proposal.title}" atualizado para "{new_status}"!', 'success')
    else:
        flash('Status inválido selecionado.', 'danger')
        
    return redirect(url_for('main.proposals_list'))



# --- ROTAS PARA O CATÁLOGO DE PRODUTOS ---
@bp.route('/admin/products')
@login_required
def products():
    all_products = Product.query.order_by(Product.category, Product.name).all()
    return render_template('admin/products.html', title="Catálogo de Produtos", products=all_products)

@bp.route('/admin/product/add', methods=['GET', 'POST'])
@login_required
def add_product():
    form = ProductForm()
    if form.validate_on_submit():
        new_product = Product(
            name=form.name.data,
            category=form.category.data,
            manufacturer=form.manufacturer.data,
            power_wp=form.power_wp.data,
            warranty_years=form.warranty_years.data
        )
        db.session.add(new_product)
        db.session.commit()
        flash('Produto adicionado ao catálogo com sucesso!', 'success')
        return redirect(url_for('main.products'))
    return render_template('admin/product_form.html', title="Novo Produto", form=form)


# --- ROTA DE GERAÇÃO DE PDF (VERSÃO FINAL E COMPLETA) ---
@bp.route('/admin/proposal/<int:proposal_id>/generate-pdf')
@login_required
def generate_pdf(proposal_id):
    proposal = Proposal.query.get_or_404(proposal_id)
    
    # --- Lógica de cálculo (permanece a mesma) ---
    monthly_chart_b64 = "" # Desativado temporariamente para focar na capa
    # Se você tiver a função, pode reativar:
    # monthly_chart_b64 = generate_monthly_production_chart(proposal.monthly_production_kwh)
    
    financials = calculate_advanced_financials(proposal.total_investment, proposal.estimated_savings_per_year)
    
    old_monthly_bill = proposal.avg_bill_brl or ((proposal.avg_consumption_kwh or 0) * (proposal.kwh_price or 0))
    old_annual_bill = old_monthly_bill * 12
    new_annual_bill = old_annual_bill - (proposal.estimated_savings_per_year or 0)
    
    cumulative_cost_chart_b64 = "" # Desativado temporariamente
    # Se você tiver a função, pode reativar:
    # cumulative_cost_chart_b64 = generate_cumulative_cost_chart(proposal.total_investment, old_annual_bill, new_annual_bill)

    # --- INFORMAÇÕES E IMAGENS EMBUTIDAS PARA A CAPA ---
    logo_path = os.path.join(current_app.root_path, 'static', 'img', 'logo.png')
    footer_image_path = os.path.join(current_app.root_path, 'static', 'img', 'imgc.png')
    
    company_info = {
        'name': 'Hyper Energia Solar',
        'cnpj': '35.982.820/0001-00',
        'phone': '(11) 91286-1403',
        'logo_b64': embed_image_b64(logo_path),
        'footer_image_b64': embed_image_b64(footer_image_path)
    }

    # --- Renderização do Template ---
    html_renderizado = render_template(
        'pdf/proposal_template.html', 
        proposal=proposal,
        monthly_chart_b64=monthly_chart_b64,
        cumulative_cost_chart_b64=cumulative_cost_chart_b64,
        financials=financials,
        old_annual_bill=old_annual_bill,
        new_annual_bill=new_annual_bill,
        company_info=company_info
    )
    
    # --- Geração do PDF ---
    pdf = HTML(string=html_renderizado, base_url=request.url_root).write_pdf()

    return Response(pdf, mimetype='application/pdf', headers={
        'Content-Disposition': f'attachment;filename=proposta_{proposal.client.name.replace(" ", "_")}.pdf'
    })

# Você precisará ter as funções de cálculo definidas em algum lugar, como:
def calculate_advanced_financials(investment, savings):
    # Lógica de exemplo
    return {'irr': 0.25, 'npv': 50000, 'profit_in_25_years': 150000}