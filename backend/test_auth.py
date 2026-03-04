import requests

BASE_URL = "http://127.0.0.1:8000/api/auth"

def test_auth_flow():
    # 1. Register
    email = "test@example.com"
    password = "password123"
    print(f"Registering {email}...")
    reg_res = requests.post(f"{BASE_URL}/register", json={
        "name": "Test User",
        "email": email,
        "password": password
    })
    print(f"Register status: {reg_res.status_code}")
    print(f"Register body: {reg_res.text}")

    # 2. Login
    print(f"Logging in {email}...")
    login_res = requests.post(f"{BASE_URL}/token", data={
        "username": email,
        "password": password
    })
    print(f"Login status: {login_res.status_code}")
    print(f"Login body: {login_res.text}")

if __name__ == "__main__":
    test_auth_flow()
