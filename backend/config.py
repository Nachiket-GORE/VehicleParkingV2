class Config():
    DEBUG = False
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class LocalDevelopmentConfig(Config):
    SQLALCHEMY_DATABASE_URI = "sqlite:///database.sqlite3"
    DEBUG = True
    SECURITY_PASSWORD_HASH = 'bcrypt'
    SECURITY_PASSWORD_SALT = 'thisshouldbekeptsecret'
    SECRET_KEY = "shouldbekeyveryhidden"
    SECURITY_TOKEN_AUTHENTICATION_HEADER = 'Authentication-Token'
    SECURITY_TOKEN_MAX_AGE = 3600
    SECURITY_JOIN_USER_ROLES = True
    SECURITY_PASSWORD_SINGLE_HASH = 'plaintext'
    
    # Mail configuration - MOVE THESE INSIDE THE CLASS
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = 'mydummytesting50@gmail.com'
    MAIL_PASSWORD = 'yzne nsku zwpy fdeu'
    MAIL_DEFAULT_SENDER = 'mydummytesting50@gmail.com'
    MAIL_SUPPRESS_SEND = False
    MAIL_DEBUG = True