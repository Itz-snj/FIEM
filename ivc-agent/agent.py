import os
import threading
import time
import csv
import random
from flask import Flask, request
from twilio.twiml.voice_response import VoiceResponse
from twilio.rest import Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Ambulance, Reporting, and SMS Logic ---
def assign_ambulance(description):
    description = description.lower()
    icu_keywords = ["accident", "multiple injuries", "high blood loss", "unconscious", "critical", "severe", "chest pain"]
    ambulance_type = "Basic Life Support Ambulance"
    if any(keyword in description for keyword in icu_keywords):
        ambulance_type = "ICU - Super Speciality Ambulance"
    
    drivers = ["Rajesh Kumar", "Suresh Singh", "Anil Sharma", "Vikas Patel"]
    car_plates = ["WB 01 AB 1234", "WB 02 CD 5678", "WB 03 EF 9101", "WB 04 GH 1121"]
    
    ambulance_details = {
        "type": ambulance_type,
        "car_number": random.choice(car_plates),
        "driver_name": random.choice(drivers),
        "driver_number": f"+91 98765 {random.randint(10000, 99999)}",
    }
    return ambulance_details

def generate_report(call_details):
    file_exists = os.path.isfile('call_report.csv')
    with open('call_report.csv', 'a', newline='') as csvfile:
        fieldnames = ['call_time', 'user_phone', 'emergency_type', 'description', 'location', 'ambulance_type', 'ambulance_car_number', 'driver_name', 'driver_number']
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()
        
        writer.writerow({
            'call_time': call_details.get('time'),
            'user_phone': call_details.get('user_phone'),
            'emergency_type': call_details.get('emergency_type'),
            'description': call_details.get('description'),
            'location': call_details.get('location'),
            'ambulance_type': call_details.get('ambulance', {}).get('type'),
            'ambulance_car_number': call_details.get('ambulance', {}).get('car_number'),
            'driver_name': call_details.get('ambulance', {}).get('driver_name'),
            'driver_number': call_details.get('ambulance', {}).get('driver_number'),
        })
    print("Call report successfully generated in call_report.csv")

def send_sms_summary(call_details):
    account_sid = os.environ["TWILIO_ACCOUNT_SID"]
    auth_token = os.environ["TWILIO_AUTH_TOKEN"]
    client = Client(account_sid, auth_token)

    ambulance = call_details.get('ambulance', {})
    summary_text = (
        f"Emergency Ambulance Service Summary:\n"
        f"Ambulance Type: {ambulance.get('type')}\n"
        f"Vehicle No: {ambulance.get('car_number')}\n"
        f"Driver: {ambulance.get('driver_name')}\n"
        f"Driver's No: {ambulance.get('driver_number')}"
    )
    try:
        message = client.messages.create(
            to=call_details.get('user_phone'),
            from_=os.environ["TWILIO_PHONE_NUMBER"],
            body=summary_text
        )
        print(f"SMS summary sent successfully to {call_details.get('user_phone')} (SID: {message.sid})")
    except Exception as e:
        print(f"\nERROR: Could not send SMS. {e}")

# --- Agent Logic ---
class IVCAgent:
    def __init__(self):
        self.state = "GREETING"
        self.details = {
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def respond(self, user_input):
        if self.state == "GREETING":
            self.state = "GET_EMERGENCY"
            return "Hello, this is the emergency ambulance service. What is your emergency?", False
        
        elif self.state == "GET_EMERGENCY":
            self.details['emergency_type'] = user_input
            self.state = "GET_DETAILS"
            return f"I understand you have a {user_input} emergency. Can you please provide more details about the patient's condition?", False

        elif self.state == "GET_DETAILS":
            self.details['description'] = user_input
            self.state = "GET_LOCATION"
            return "Thank you. Now, please tell me the full address for the pickup, including a nearby landmark.", False

        elif self.state == "GET_LOCATION":
            self.details['location'] = user_input
            self.state = "SUMMARY"
            ambulance = assign_ambulance(self.details.get('description', ''))
            self.details['ambulance'] = ambulance
            
            generate_report(self.details)
            send_sms_summary(self.details)

            summary = (
                f"OK. I have booked an ambulance and sent the details to your phone. Here is a summary of your case. "
                f"The emergency is: {self.details.get('emergency_type')}. "
                f"The pickup address is: {self.details.get('location')}. "
                f"We have assigned a {ambulance['type']}. "
                f"The vehicle number is {ambulance['car_number']}. "
                f"The driver is {ambulance['driver_name']}, and their number is {ambulance['driver_number']}. "
                f"The ambulance will arrive shortly."
            )
            return summary, False

        elif self.state == "SUMMARY":
            self.state = "END"
            return "A summary of this call has been saved. Is there anything else I can help you with?", False

        elif self.state == "END":
            return "Thank you for using our service. Goodbye.", True

agent = IVCAgent()

# --- Twilio Webhook and Call Initiation ---
@app.route("/voice", methods=['GET', 'POST'])
def voice():
    resp = VoiceResponse()
    user_input = request.values.get('SpeechResult', None)
    
    if agent.state == "GREETING":
        # Reset agent state and capture user's phone number for the session
        agent.__init__()
        agent.details['user_phone'] = request.values.get('To')

    agent_response, hangup = agent.respond(user_input)
    resp.say(agent_response, voice='alice')

    if hangup:
        resp.hangup()
    else:
        resp.gather(input='speech', action='/voice', speechTimeout='auto')

    return str(resp)

def make_call(user_phone_number, ngrok_url):
    try:
        account_sid = os.environ["TWILIO_ACCOUNT_SID"]
        auth_token = os.environ["TWILIO_AUTH_TOKEN"]
        twilio_phone_number = os.environ["TWILIO_PHONE_NUMBER"]
        if 'ACxxxxxxxx' in account_sid or not auth_token or not twilio_phone_number:
            print("\nERROR: Please update the .env file with your real Twilio credentials.")
            return
    except KeyError:
        print("\nERROR: Could not find Twilio credentials in the .env file.")
        return

    client = Client(account_sid, auth_token)
    print(f"\nInitiating call to {user_phone_number}...")
    try:
        call = client.calls.create(to=user_phone_number, from_=twilio_phone_number, url=f"{ngrok_url}/voice")
        print(f"Call initiated with SID: {call.sid}")
        print("Waiting for you to answer the call...")
    except Exception as e:
        print(f"\nERROR: Could not make the call. {e}")

if __name__ == "__main__":
    # This part of the script is now only for initiating the call
    # The user's phone number is captured by the /voice webhook when the call connects
    print("--- IVC Agent Click-to-Call Setup ---")
    print("1. Make sure you have filled in your credentials in the .env file.")
    print("2. Make sure ngrok is running (e.g., 'ngrok http 5000')")
    ngrok_url = input("3. Enter your ngrok forwarding URL (e.g., http://xxxx.ngrok.io): ")

    if not ngrok_url.startswith("http"):
        print("\nInvalid ngrok URL.")
    else:
        user_phone = input("4. Enter your phone number (with country code): ")
        
        flask_thread = threading.Thread(target=lambda: app.run(port=5000))
        flask_thread.daemon = True
        flask_thread.start()
        time.sleep(1)

        make_call(user_phone, ngrok_url)

        print("\n--- The agent is running. Keep this terminal open. ---")
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down...")