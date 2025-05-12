import firebase_admin
from firebase_admin import credentials, db

cred = credentials.Certificate("service_account.json")
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://skripsi-dd340-default-rtdb.firebaseio.com/'
})

def save_budget(data):
    ref = db.reference('global/budget')
    ref.set(data)

def get_realtime_data():
    return db.reference('SEM/Realtime_Data').get()

def get_hourly_data(limit=24):
    return dict(list(db.reference('SEM/Hourly_Data').get().items())[-limit:])
