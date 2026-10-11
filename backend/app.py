import os
import random
import string
from datetime import datetime
from flask import Flask, request, render_template, jsonify, redirect, url_for, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail, Message
from werkzeug.security import generate_password_hash, check_password_hash

#backend stuff
import io
import base64
from ultralytics import YOLO
from PIL import Image

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "../frontend"),
    static_folder=os.path.join(BASE_DIR, "../frontend"),
    static_url_path="/static"
)

# Serve reorganized frontend asset folders directly (css, js, images)
@app.route('/css/<path:filename>')
def serve_css(filename):
    return send_from_directory(os.path.join(BASE_DIR, '../frontend/css'), filename)

@app.route('/js/<path:filename>')
def serve_js(filename):
    return send_from_directory(os.path.join(BASE_DIR, '../frontend/js'), filename)

@app.route('/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(BASE_DIR, '../frontend/images'), filename)

# =====================
# DATABASE CONFIG
# =====================
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(BASE_DIR, 'instance', 'database.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# =====================
# EMAIL CONFIG
# =====================
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'axon.systems.tech@gmail.com'
# Reminder: Keep this password secure!
app.config['MAIL_PASSWORD'] = 'kgkuxgqiykjvydeb' 

mail = Mail(app)

# =====================
# USER MODEL
# =====================
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    is_verified = db.Column(db.Boolean, default=False)
    verification_code = db.Column(db.String(6), nullable=True)

with app.app_context():
    db.create_all()

# =====================
# PAGES
# =====================
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/signup")
def signup_page():
    return render_template("signup.html")

@app.route("/verify")
def verify_page():
    return render_template("verify.html")

@app.route("/verify.html")
def verify_html():
    return redirect(url_for("verify_page"))

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/dashboard.html")
def dashboard_html():
    return redirect(url_for("dashboard"))

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

# =====================
# SIGNUP & SEND EMAIL
# =====================
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Missing email or password"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 400

    hashed_password = generate_password_hash(password)
    code = ''.join(random.choices(string.digits, k=6))

    user = User(
        email=email,
        password=hashed_password,
        verification_code=code,
        is_verified=False
    )

    db.session.add(user)
    db.session.commit()

    # Professional HTML Email Template
    msg = Message(
        subject="Verify your Axon Account",
        sender=("Axon", app.config['MAIL_USERNAME']),
        recipients=[email]
    )
    
    # Plain text fallback for old email clients
    msg.body = f"Welcome to Axon. Your verification code is: {code}"
    
    # Professional HTML version matching your website's exact style
    msg.html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Manrope:wght@600;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; background-color: #FFFFFF;">
        <div style="font-family: 'Poppins', 'Manrope', Arial, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px;">
            
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">
                    <span style="color: #0084D4; 
                                 background-image: linear-gradient(to right, #0084D4, #88D8FF); 
                                 -webkit-background-clip: text; 
                                 background-clip: text; 
                                 -webkit-text-fill-color: transparent;">
                        AXON
                    </span>
                </h1>
                <p style="color: #6D6D6D; font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 600; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">
                    AI-Assisted Multi-Condition Analysis
                </p>
            </div>
            
            <div style="background-color: #FFFFFF; padding: 40px; border-radius: 40px; border: 2px solid #88D8FF; text-align: center; box-shadow: 0 20px 40px rgba(0, 164, 244, 0.05);">
                <h2 style="color: #3D3D3D; margin-top: 0; font-size: 24px; font-weight: 700;">Verify your email</h2>
                <p style="color: #4F4F4F; font-family: 'Manrope', sans-serif; font-size: 16px; font-weight: 600; line-height: 1.6;">
                    Welcome to the future of neuro-diagnostics through precision AI. <br> Use the code below to secure your account.
                </p>
                
                <div style="display: inline-block; margin: 30px 0; padding: 20px 45px; background: linear-gradient(135deg, #f8fdff 0%, #e1f4ff 100%); border-radius: 20px; border: 1px dashed #00A4F4;">
                    <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; 
                                 color: #0084D4; 
                                 background-image: linear-gradient(to right, #0084D4, #88D8FF); 
                                 -webkit-background-clip: text; 
                                 background-clip: text; 
                                 -webkit-text-fill-color: transparent;
                                 text-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        {code}
                    </span>
                </div>
                
                <p style="color: #B0B0B0; font-family: 'Manrope', sans-serif; font-size: 12px; margin-top: 20px;">
                    If you didn't request this, you can safely ignore this message.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 40px; padding-top: 20px;">
                <div style="margin-bottom: 10px;">
                    <span style="color: #D1D1D1; font-family: 'Manrope', sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; display: inline-block; white-space: nowrap;">
                        Acquire • Analyze • Act on
                    </span>
                </div>
                <p style="color: #B0B0B0; font-family: 'Manrope', sans-serif; font-size: 11px;">
                    &copy; 2026 AXON — All rights reserved.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        mail.send(msg)
        return jsonify({"message": "Verification code sent"}), 200
    except Exception as e:
        # If mail fails, we should technically roll back the user creation or allow resend
        return jsonify({"message": "User created but email failed to send.", "error": str(e)}), 500

# =====================
# VERIFY
# =====================
@app.route("/verify", methods=["POST"])
def verify():
    data = request.get_json() or {}

    email = (data.get("email") or "").strip().lower()
    code = str(data.get("code") or "").strip()

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    if user.verification_code != code:
        return jsonify({"message": "Invalid code"}), 400

    user.is_verified = True
    user.verification_code = None
    db.session.commit()

    return jsonify({"message": "Verified successfully"}), 200

# =====================
# LOGIN
# =====================
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"message": "User not found"}), 404

    if not check_password_hash(user.password, password):
        return jsonify({"message": "Wrong password"}), 400

    if not user.is_verified:
        return jsonify({"message": "Email not verified"}), 403

    return jsonify({"message": "Login successful"}), 200

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
OUTPUT_FOLDER = os.path.join(BASE_DIR, "outputs")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

try:
    models = {
        'hemorrhage': YOLO('models/hemorrhage.pt'),
        'tumor': YOLO('models/tumor.pt'),
        'stenosis': YOLO('models/stenosis.pt')
    }
except Exception as e:
    print(f"CRITICAL ERROR: Could not load models. Error: {e}")
    models = {}

import uuid

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    condition = request.form.get('condition', 'hemorrhage')

    file = request.files['image']

    img_bytes = file.read()
    try:
        img = Image.open(io.BytesIO(img_bytes))
    except Exception as e:
        return jsonify({'error': 'Invalid image file', 'details': str(e)}), 400

    model = models.get(condition)
    if not model:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        results = model(img)
        res_plotted = results[0].plot()
        res_img = Image.fromarray(res_plotted[..., ::-1])
    except Exception as e:
        return jsonify({'error': 'Model inference failed', 'details': str(e)}), 500

    labels = []
    if hasattr(results[0], 'boxes') and len(results[0].boxes) > 0:
        names = results[0].names
        try:
            cls_values = results[0].boxes.cls
            if hasattr(cls_values, 'cpu'):
                cls_values = cls_values.cpu().numpy().tolist()
            else:
                cls_values = list(cls_values)
            for cls in cls_values:
                label_text = names[int(cls)] if names and cls is not None else None
                if label_text:
                    labels.append(label_text)
        except Exception:
            pass

    unique_labels = []
    for label in labels:
        if label not in unique_labels:
            unique_labels.append(label)

    analysis_label = ', '.join(unique_labels) if unique_labels else condition.capitalize()

    filename = f"{uuid.uuid4()}.jpg"
    
    # Save original image to uploads folder
    original_filepath = os.path.join(UPLOAD_FOLDER, filename)
    with open(original_filepath, 'wb') as f:
        f.write(img_bytes)
    
    # Save analyzed image to outputs folder
    analyzed_filepath = os.path.join(OUTPUT_FOLDER, filename)
    res_img.save(analyzed_filepath)
    
    # Web-accessible filename (served at /outputs/<filename>)
    image_url = filename

    buffer = io.BytesIO()
    res_img.save(buffer, format="JPEG")
    encoded_img = base64.b64encode(buffer.getvalue()).decode('utf-8')

    response = {
        'image': encoded_img,
        'condition': condition.capitalize(),
        'count': len(results[0].boxes),
        'message': 'Prediction returned successfully.',
        'image_url': image_url,
        'label': analysis_label
    }
    return jsonify(response)

@app.route('/outputs/<filename>')
def get_output_image(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

# =====================
# RUN (Fixed for Windows)
# =====================
if __name__ == "__main__":
    # Added the Windows socket fix we discussed earlier
    app.run(debug=True, port=5000, use_reloader=False, threaded=True)