from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, TextAreaField, FloatField, DateField, IntegerField, SelectField, RadioField, HiddenField, SelectField
from wtforms.validators import DataRequired, Email, Length, Optional, NumberRange
from wtforms_sqlalchemy.fields import QuerySelectField # <-- NOVA IMPORTAÇÃO
from app.models import Concessionaria, Product



# --- NOVA FUNÇÃO PARA POPULAR O QUERYSELECTFIELD ---
def concessionaria_query():
    return Concessionaria.query.order_by(Concessionaria.name)



# --- NOVA FUNÇÃO PARA POPULAR O SELECT DE PRODUTOS ---
def product_query():
    return Product.query.order_by(Product.category, Product.name)



class ProposalItemForm(FlaskForm):
    """Formulário para adicionar itens a uma Proposta a partir do catálogo."""
    product = QuerySelectField('Produto do Catálogo', query_factory=product_query, get_label='name', allow_blank=False)
    quantity = IntegerField('Quantidade', default=1, validators=[DataRequired(), NumberRange(min=1)])
    unit_price = FloatField('Preço Unitário (R$)', validators=[DataRequired(), NumberRange(min=0)], description="Preencha para substituir o preço padrão do produto.")
    submit = SubmitField('Adicionar Item')




class ProposalForm(FlaskForm):
    title = StringField('Título da Proposta', validators=[DataRequired()])
    valid_until = DateField('Válida Até', format='%Y-%m-%d', validators=[Optional()])
    
    kwh_price = FloatField('Valor da Tarifa de Energia (R$/kWh)', validators=[Optional()])
    public_lighting_fee = FloatField('Taxa de Iluminação Pública (R$)', validators=[Optional()])
    concessionaria = QuerySelectField('Concessionária', query_factory=concessionaria_query, get_label='name', allow_blank=True, blank_text='-- Selecione --')

    consumption_input_type = RadioField('Entrada de Consumo', choices=[('kwh', 'Consumo (kWh/mês)'), ('brl', 'Fatura (R$/mês)')], default='kwh')
    avg_consumption_kwh = FloatField('Consumo Médio Mensal (kWh)', validators=[Optional()])
    avg_bill_brl = FloatField('Valor Médio da Fatura (R$)', validators=[Optional()])
    grid_type = SelectField('Tipo de Rede', choices=[('monofasica', 'Monofásica'), ('bifasica', 'Bifásica'), ('trifasica', 'Trifásica')], validators=[DataRequired()])
    
    solar_irradiance = FloatField('Irradiação Solar Média (Hsp)', render_kw={'readonly': True})
    notes = TextAreaField('Observações')
    
    # --- CAMPO NOVO PARA O "CARRINHO" ---
    # Este campo receberá o JSON dos itens do admin.js
    proposal_items_json = HiddenField('Itens JSON')

    # --- CAMPOS REMOVIDOS ---
    # panel_power_wp (agora virá dos produtos)
    # total_investment (será a soma dos itens)
    # system_power_kwp (calculado a partir dos painéis)
    # panel_quantity (calculado a partir dos painéis)
    # recommended_inverter_kw (calculado a partir do inversor)
    
    submit = SubmitField('Salvar Proposta')






class LoginForm(FlaskForm):
    # Usaremos 'username' como o nome do campo, mas o usuário poderá digitar username ou email.
    username = StringField(
        'Usuário', 
        validators=[DataRequired(message="Este campo é obrigatório.")],
        render_kw={"placeholder": "seu-usuario"}
    )
    password = PasswordField(
        'Senha', 
        validators=[DataRequired(message="Este campo é obrigatório."), Length(min=4, message="A senha é muito curta.")],
        render_kw={"placeholder": "********"}
    )
    remember_me = BooleanField('Lembrar-me')
    submit = SubmitField('Entrar')




class ClientForm(FlaskForm):
    client_type = StringField('Tipo de Cliente') # Será controlado pelo JS
    name = StringField('Nome Completo / Razão Social', validators=[DataRequired()])
    fantasy_name = StringField('Nome Fantasia')
    cpf_cnpj = StringField('CPF / CNPJ', validators=[DataRequired()])
    state_registration = StringField('Inscrição Estadual')
    
    email = StringField('E-mail', validators=[Optional(), Email()])
    phone = StringField('Telefone / WhatsApp')
    
    cep = StringField('CEP')
    address = StringField('Logradouro')
    number = StringField('Número')
    complement = StringField('Complemento')
    neighborhood = StringField('Bairro')
    city = StringField('Cidade')
    state = StringField('UF')

    submit = SubmitField('Salvar Cliente')




# --- NOVO FORMULÁRIO PARA O MODAL ---
class ConcessionariaForm(FlaskForm):
    name = StringField('Nome da Concessionária', validators=[DataRequired()])
    fio_b_price = FloatField('Valor do Fio B (R$/kWh)', validators=[DataRequired()])
    submit = SubmitField('Salvar')



class ProductForm(FlaskForm):
    """Formulário para adicionar/editar Produtos."""
    name = StringField('Nome do Produto/Serviço', validators=[DataRequired()])
    category = SelectField('Categoria', choices=[
        ('Módulo', 'Módulo Fotovoltaico'),
        ('Inversor', 'Inversor'),
        ('Estrutura', 'Estrutura de Montagem'),
        ('Mão de Obra', 'Mão de Obra'),
        ('Outros', 'Outros')
    ])
    manufacturer = StringField('Fabricante')
    power_wp = IntegerField('Potência', validators=[Optional()])
    warranty_years = IntegerField('Garantia (Anos)', validators=[Optional()])
    submit = SubmitField('Salvar Produto')