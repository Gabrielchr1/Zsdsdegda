# app/models.py
from datetime import datetime
from app import db
from flask_login import UserMixin
import bcrypt

# -----------------------
# CLASSE DE USUÁRIOS
# -----------------------
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)

    clients = db.relationship('Client', backref='user', lazy='dynamic')
    proposals = db.relationship('Proposal', backref='author', lazy='dynamic')

    def set_password(self, password):
        self.password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password.encode('utf-8'))

    def __repr__(self):
        return f'<User {self.username}>'


# -----------------------
# CLASSE DE CLIENTES
# -----------------------
class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    client_type = db.Column(db.String(10), default='PF')  # PF ou PJ
    name = db.Column(db.String(120), index=True, nullable=False)
    fantasy_name = db.Column(db.String(120))
    cpf_cnpj = db.Column(db.String(20), unique=True, index=True)
    state_registration = db.Column(db.String(20))

    email = db.Column(db.String(120), index=True)
    phone = db.Column(db.String(20))

    cep = db.Column(db.String(10))
    address = db.Column(db.String(200))
    number = db.Column(db.String(20))
    complement = db.Column(db.String(100))
    neighborhood = db.Column(db.String(100))
    city = db.Column(db.String(100))
    state = db.Column(db.String(2))

    timestamp = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    proposals = db.relationship('Proposal', backref='client', lazy='dynamic', cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Client {self.name}>'


# -----------------------
# CLASSE DE PROPOSTAS
# -----------------------
class Proposal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    status = db.Column(db.String(20), default='Ativa', index=True)
    creation_date = db.Column(db.DateTime, index=True, default=datetime.utcnow)
    valid_until = db.Column(db.DateTime)
    total_investment = db.Column(db.Float)
    estimated_savings_per_year = db.Column(db.Float)
    notes = db.Column(db.Text)

    # Dimensionamento
    panel_power_wp = db.Column(db.Integer)
    panel_quantity = db.Column(db.Integer)
    recommended_inverter_kw = db.Column(db.Float)

    # Tarifas
    kwh_price = db.Column(db.Float)
    public_lighting_fee = db.Column(db.Float)

    # Concessionária
    concessionaria_id = db.Column(db.Integer, db.ForeignKey('concessionaria.id'))
    concessionaria = db.relationship('Concessionaria')


    # --- NOVOS CAMPOS DE PAGAMENTO ---
    credit_card_installments = db.Column(db.Integer, nullable=True)
    credit_card_interest_rate = db.Column(db.Float, nullable=True) # Armazena 14.0 para 14%
    
    financing_installments = db.Column(db.Integer, nullable=True)
    financing_interest_rate = db.Column(db.Float, nullable=True) # Armazena 131.0 para 131%

    # Cálculos
    consumption_input_type = db.Column(db.String(10), default='kwh')
    avg_consumption_kwh = db.Column(db.Float)
    avg_bill_brl = db.Column(db.Float)
    grid_type = db.Column(db.String(20))
    solar_irradiance = db.Column(db.Float)
    system_power_kwp = db.Column(db.Float)
    monthly_production_kwh = db.Column(db.JSON)
    payback_years = db.Column(db.Float)

    kwh_adjustment = db.Column(db.Integer, nullable=True)

    # Relacionamentos
    client_id = db.Column(db.Integer, db.ForeignKey('client.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    items = db.relationship('ProposalItem', backref='proposal', lazy='dynamic', cascade="all, delete-orphan")

    def __repr__(self):
        return f'<Proposal {self.title}>'







# -----------------------
# CLASSE DE ITENS DE PROPOSTA
# -----------------------
class ProposalItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quantity = db.Column(db.Integer, default=1)
    
    # --- CAMPOS REMOVIDOS ---
    # unit_price = db.Column(db.Float)
    # total_price = db.Column(db.Float)

    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    product = db.relationship('Product')

    proposal_id = db.Column(db.Integer, db.ForeignKey('proposal.id'), nullable=False)

    def __repr__(self):
        return f'<ProposalItem {self.product.name} x {self.quantity}>'



# -----------------------
# CLASSE DE PRODUTOS
# -----------------------
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    category = db.Column(db.String(50), index=True)
    manufacturer = db.Column(db.String(100))
    power_wp = db.Column(db.Integer)
    warranty_years = db.Column(db.Integer)
    
    # --- CAMPO ADICIONADO ---
    # Armazena o caminho *relativo* da imagem, ex: 'uploads/products/meu_painel.png'
    image_url = db.Column(db.String(255), nullable=True) 

    def __repr__(self):
        return f'<Product {self.name}>'








# -----------------------
# CLASSE DE CONCESSIONÁRIAS
# -----------------------
class Concessionaria(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    fio_b_price = db.Column(db.Float, nullable=False)

    def __repr__(self):
        return f'<Concessionaria {self.name}>'
