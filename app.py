from flask import Flask, jsonify, request, render_template
from datetime import datetime
import firebase_utils as fb

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# API to save budget
@app.route('/api/budget', methods=['POST'])
def save_budget():
    data = request.json
    fb.save_budget({
        'amount_idr': float(data['amount']),
        'rate': float(data['rate']),
        'timestamp': datetime.now().isoformat()
    })
    return jsonify({"status": "success"})

# API to get realtime data
@app.route('/api/realtime')
def get_realtime():
    return jsonify(fb.get_realtime_data())

# API to get hourly data
@app.route('/api/hourly')
def get_hourly():
    return jsonify(fb.get_hourly_data(limit=24))

if __name__ == '__main__':
    app.run(debug=True)
