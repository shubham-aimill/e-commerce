import streamlit as st
import requests
import io
from PIL import Image

# ==================================================
# 1. CONFIGURATION
# ==================================================
# Ensure your FastAPI server is running on this URL (check your terminal)
BASE_URL = "http://127.0.0.1:8000"

st.set_page_config(page_title="VTO Frontend Client", layout="wide")
st.title("🛡️ Gemini 3 VTO: Streamlit-FastAPI Integration")

# ==================================================
# 2. USER INPUTS (Frontend Only)
# ==================================================
st.sidebar.header("Step 1: Identity")
gender = st.sidebar.selectbox("Gender", ["male", "female"])
user_input = st.sidebar.file_uploader("Upload Profile Image", type=["jpg", "jpeg", "png"])

if user_input:
    st.image(user_input, caption="Uploaded User", width=250)
else:
    st.info("Using default model image from backend.")

st.sidebar.header("Step 2: Product Selection")
category = st.sidebar.selectbox("Category", ["tshirts", "pants", "jackets", "shoes"])
current_brand = st.sidebar.selectbox("Known Brand", ["Nike", "Adidas", "Zara"])
current_size = st.sidebar.text_input("Known Size (e.g., M, 44, 8)", value="M")
target_brand = st.sidebar.selectbox("Target Brand", ["Nike", "Adidas", "Zara"])

# ==================================================
# 3. EXECUTION (The Integration Call)
# ==================================================
st.markdown("---")
st.subheader("Virtual Try-On Execution")

if st.button("Generate Real Try-On"):
    with st.spinner("🔄 Sending request to FastAPI Backend..."):
        
        # Prepare the form data for the API
        payload = {
            "gender": gender,
            "category": category,
            "current_brand": current_brand,
            "current_size": current_size,
            "target_brand": target_brand
        }

        # Prepare the file if uploaded
        files = None
        if user_input:
            files = {"user_image": (user_input.name, user_input.getvalue(), user_input.type)}

        try:
            # CALLING THE FASTAPI BACKEND
            response = requests.post(
                f"{BASE_URL}/generate-tryon", 
                data=payload, 
                files=files
            )

            if response.status_code == 200:
                # The backend returns raw image bytes
                generated_img = Image.open(io.BytesIO(response.content))
                
                st.success("✅ Try-On Generated via Backend!")
                st.image(generated_img, caption="Final Result from Gemini 3")
                
                # Check for metadata headers we added to app.py
                mapped_size = response.headers.get("X-Mapped-Size")
                if mapped_size:
                    st.sidebar.metric("Target Mapped Size", mapped_size)

            else:
                # Error handling from FastAPI (400, 404, 500)
                error_detail = response.json().get('detail', 'Unknown Error')
                st.error(f"❌ Backend Error ({response.status_code}): {error_detail}")

        except requests.exceptions.ConnectionError:
            st.error("❌ Could not connect to FastAPI. Is 'uvicorn app:app' running?")

# ==================================================
# 4. DIAGNOSTICS
# ==================================================
st.sidebar.markdown("---")
if st.sidebar.button("Check Backend Health"):
    try:
        health = requests.get(f"{BASE_URL}/health").json()
        st.sidebar.write(health)
    except:
        st.sidebar.error("Backend Offline")