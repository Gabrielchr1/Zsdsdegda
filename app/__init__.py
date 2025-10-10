from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from config import Config
from sqlalchemy import MetaData
from markupsafe import escape, Markup

# convenção de nomes
naming_convention = { ... }

db = SQLAlchemy(metadata=MetaData(naming_convention=naming_convention))
migrate = Migrate()
login_manager = LoginManager()
login_manager.login_view = 'main.login'
login_manager.login_message = 'Por favor, faça login para acessar esta página.'
login_manager.login_message_category = 'info'

def nl2br(value):
    return Markup(escape(value).replace('\n', '<br>\n'))

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    from app.routes import bp as main_blueprint
    app.register_blueprint(main_blueprint)
    app.jinja_env.filters['nl2br'] = nl2br

    return app

# importa modelos **depois** de criar db
from app.models import User

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
