# app/config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'voce-nunca-vai-adivinhar'
    # Somente PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://neondb_owner:npg_7KVwyYtzsF6U@ep-patient-tree-adv0mh0a-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
