import streamlit as st
import requests
from PIL import Image
import io
import base64

# ==================================================
# 1. CONFIGURATION
# ==================================================
st.set_page_config(page_title="AI Photoshoot Studio", layout="wide")
BASE_URL = "http://localhost:8000"

st.markdown("""
<style>
    .stButton > button { width: 100%; border-radius: 8px; font-weight: 500; }
    .tone-circle { width: 30px; height: 30px; border-radius: 50%; display: inline-block; margin-right: 10px; border: 2px solid #ddd; }
    .block-container { padding-top: 2rem; }
    img { transition: none !important; }
</style>
""", unsafe_allow_html=True)

# State Management
if "selected_template" not in st.session_state:
    st.session_state["selected_template"] = None
if "selected_region" not in st.session_state:
    st.session_state["selected_region"] = "Indian"

# ==================================================
# ⚡ CACHING LAYER
# ==================================================
@st.cache_data(ttl=3600, show_spinner=False)
def fetch_template_list():
    try:
        resp = requests.get(f"{BASE_URL}/templates", timeout=2)
        if resp.status_code == 200:
            return resp.json()
    except:
        return {}
    return {}

@st.cache_data(show_spinner=False)
def load_image_cached(url):
    try:
        response = requests.get(url, timeout=3)
        if response.status_code == 200:
            return Image.open(io.BytesIO(response.content))
    except:
        return None

# ==================================================
# 2. UI LAYOUT
# ==================================================
st.title("📸 AI Model Photoshoot Generator")
st.markdown("Transform ghost mannequin clothes into **multi-angle** professional model photography.")
st.divider()

col_config, col_preview = st.columns([1.5, 1], gap="large")

# --- LEFT PANEL: STYLE SELECTOR ---
with col_config:
    st.subheader("1. Style Selection")
    
    tab1, tab2, tab3 = st.tabs(["🇮🇳 Indian", "🇿🇦 South African", "🌍 Global"])
    all_templates = fetch_template_list()

    def render_grid(region_name):
        if not all_templates:
            st.error("Backend Offline.")
            return

        items = all_templates.get(region_name, [])
        cols = st.columns(2)
        
        for idx, item in enumerate(items):
            with cols[idx % 2]:
                img_obj = load_image_cached(item['img'])
                if img_obj:
                    st.image(img_obj, use_column_width=True)
                else:
                    st.warning(f"Missing: {item['name']}")

                st.caption(f"**{item['name']}**")
                
                is_selected = (st.session_state["selected_template"] and 
                               st.session_state["selected_template"]["id"] == item["id"])
                
                btn_label = "✅ Selected" if is_selected else "Select"
                btn_type = "primary" if is_selected else "secondary"
                
                if st.button(btn_label, key=item['id'], type=btn_type):
                    if not is_selected:
                        st.session_state["selected_template"] = item
                        st.session_state["selected_region"] = region_name
                        st.rerun()

    with tab1: render_grid("Indian")
    with tab2: render_grid("South African")
    with tab3: render_grid("Global")

    st.divider()

    # --- SKIN TONE ---
    st.subheader("2. Model Skin Tone")
    skin_tones = ["Fair", "Light", "Wheatish", "Tan", "Brown", "Deep Dark"]
    selected_tone = st.select_slider("Select Tone", options=skin_tones, value="Wheatish")
    
    colors = ["#F9E4D4", "#EBCBB8", "#D6B093", "#B68B6A", "#8D5F41", "#573623"]
    idx = skin_tones.index(selected_tone)
    st.markdown(f'<div style="background-color:{colors[idx]}; width:100%; height:20px; border-radius:10px;"></div>', unsafe_allow_html=True)


# --- RIGHT PANEL: WORKSPACE ---
with col_preview:
    st.subheader("3. Studio Workspace")
    
    uploaded_file = st.file_uploader("Upload Product (Ghost Mannequin)", type=["jpg", "png", "jpeg"])
    
    if uploaded_file:
        st.image(uploaded_file, caption="Original Input", width=250)
    
    st.markdown("---")
    
    ready_to_gen = uploaded_file is not None and st.session_state["selected_template"] is not None
    
    if ready_to_gen:
        sel = st.session_state["selected_template"]
        st.info(f"Generating 3 Views for: **{sel['name']}**")
        
        if st.button("✨ GENERATE 3 VIEWS", type="primary", use_container_width=True):
            
            with st.spinner("Gemini is creating Front, Side & Angle views... (This takes ~20s)"):
                files = {"cloth_image": uploaded_file.getvalue()}
                payload = {
                    "template_id": sel["id"],
                    "region": st.session_state["selected_region"],
                    "skin_tone": selected_tone
                }
                
                try:
                    resp = requests.post(f"{BASE_URL}/generate-photoshoot", data=payload, files=files)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        images_list = data.get("images", [])
                        
                        st.success("Photoshoot Complete! Here are your 3 angles:")
                        
                        # Display Results in Tabs or Columns
                        res_tabs = st.tabs(["FRONT VIEW", "SIDE VIEW", "ANGLE VIEW"])
                        
                        for i, img_data in enumerate(images_list):
                            view_name = img_data['view']
                            b64_str = img_data['image']
                            
                            # Convert Base64 back to Image
                            image_bytes = base64.b64decode(b64_str)
                            final_img = Image.open(io.BytesIO(image_bytes))
                            
                            with res_tabs[i]:
                                st.image(final_img, caption=f"{view_name} View", use_column_width=True)
                                
                                # Download Button for each
                                buf = io.BytesIO()
                                final_img.save(buf, format="PNG")
                                st.download_button(
                                    f"📥 Download {view_name}", 
                                    buf.getvalue(), 
                                    f"{view_name}_view.png", 
                                    "image/png"
                                )
                    else:
                        st.error(f"Failed: {resp.text}")
                        
                except Exception as e:
                    st.error(f"Connection Error: {e}")
    
    elif not uploaded_file:
        st.info("👈 Upload an image to start")
    elif not st.session_state["selected_template"]:
        st.warning("👈 Select a style template")