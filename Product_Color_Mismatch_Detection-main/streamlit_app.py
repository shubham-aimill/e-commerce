import os
import re
from typing import Optional

import pandas as pd
from PIL import Image
import streamlit as st
import requests


# --------------------------
# Config
# --------------------------
OUTPUT_CSV_PATH = "data/hf_products_with_verdict.csv"
IMAGE_DIR = "data/images"

FASTAPI_URL = "http://localhost:8020"


# --------------------------
# Helpers
# --------------------------
@st.cache_data
def load_data(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    return df


def pick_color_column(df: pd.DataFrame) -> Optional[str]:
    candidates = ["baseColour", "base_colour", "color", "colour"]
    for col in candidates:
        if col in df.columns:
            return col
    return None


def sanitize_id(raw: str) -> str:
    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", raw)
    return safe or "unknown"


def get_image_path(row: pd.Series, idx: int, image_dir: str = IMAGE_DIR) -> Optional[str]:

    if "id" in row.index and pd.notna(row["id"]):
        raw_id = str(row["id"])
    else:
        raw_id = str(idx)

    safe_id = sanitize_id(raw_id)
    expected_name = f"{idx:05d}_{safe_id}.jpg"
    path = os.path.join(image_dir, expected_name)

    if os.path.exists(path):
        return path

    prefix = f"{idx:05d}_"
    for fname in os.listdir(image_dir):
        if fname.startswith(prefix) and fname.lower().endswith((".jpg", ".jpeg", ".png")):
            return os.path.join(image_dir, fname)

    return None


# --------------------------
# FastAPI Integration
# --------------------------
def call_fastapi_detect_color(image: Image.Image):
    buf = st.session_state.get("api_image_buffer")
    return requests.post(
        f"{FASTAPI_URL}/detect-color",
        files={"file": ("image.png", buf, "image/png")},
    ).json()


def call_fastapi_detect_and_match(image: Image.Image, expected_color: str):
    buf = st.session_state.get("api_image_buffer")
    return requests.post(
        f"{FASTAPI_URL}/detect-and-match",
        data={"expected_color": expected_color},
        files={"file": ("image.png", buf, "image/png")},
    ).json()


# --------------------------
# Streamlit UI
# --------------------------
def main() -> None:
    st.set_page_config(
        page_title="Product Color Match Viewer",
        layout="wide",
    )

    st.title("Product Color Mismatch Viewer")

    # --------------------------
    # Section 1: API live tester
    # --------------------------
    st.header("Test color detection via FastAPI API")

    uploaded = st.file_uploader("Upload a product image", type=["jpg", "jpeg", "png"])

    if uploaded:
        image = Image.open(uploaded).convert("RGB")

        # keep buffer for multipart
        import io
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)
        st.session_state["api_image_buffer"] = buf.getvalue()

        st.image(image, caption="Uploaded image", width=250)

        catalog_color = st.text_input("Expected / catalog color (optional)")

        colA, colB = st.columns(2)

        with colA:
            if st.button("Detect color (FastAPI)"):
                with st.spinner("Calling /detect-color ..."):
                    res = requests.post(
                        f"{FASTAPI_URL}/detect-color",
                        files={"file": ("image.png", buf, "image/png")},
                    )
                try:
                    st.json(res.json())
                except Exception:
                    st.error("Backend did not return valid JSON.")
                    st.code(res.text)
                    st.write("Status code:", res.status_code)


        with colB:
            if st.button("Detect and Match (FastAPI)"):
                if not catalog_color:
                    st.warning("Provide catalog color first.")
                else:
                    with st.spinner("Calling /detect-and-match ..."):
                        res = requests.post(
                            f"{FASTAPI_URL}/detect-and-match",
                            data={"expected_color": catalog_color},
                            files={"file": ("image.png", buf, "image/png")},
                        )
                    try:
                        st.json(res.json())
                    except Exception:
                        st.error("Backend did not return valid JSON.")
                        st.code(res.text)
                        st.write("Status code:", res.status_code)


    st.divider()

    # --------------------------
    # Section 2: existing CSV browser (unchanged)
    # --------------------------
    st.header("Browse processed dataset (CSV)")

    if not os.path.exists(OUTPUT_CSV_PATH):
        st.error(f"Output CSV not found at: {OUTPUT_CSV_PATH}")
        st.stop()

    df = load_data(OUTPUT_CSV_PATH)

    if df.empty:
        st.warning("Dataset is empty. Run the pipeline first to generate the CSV.")
        st.stop()

    color_col = pick_color_column(df)
    if color_col is None:
        st.error(
            "Could not find a color column. Expected one of: "
            "`baseColour`, `base_colour`, `color`, `colour`."
        )
        st.stop()

    for col in ["detected_color", "detected_confidence", "Verdict"]:
        if col not in df.columns:
            st.error(f"Missing required column in CSV: '{col}'")
            st.stop()

    st.sidebar.header("Filters")

    verdict_options = ["All", "Match", "Mismatch"]
    verdict_choice = st.sidebar.radio("Match status", verdict_options, index=0)

    filtered_df = df.copy()
    if verdict_choice != "All":
        filtered_df = filtered_df[filtered_df["Verdict"] == verdict_choice]

    unique_colors = sorted(filtered_df[color_col].dropna().unique().tolist())
    color_choice = st.sidebar.multiselect(
        "Existing color filter",
        options=unique_colors,
        default=[],
    )
    if color_choice:
        filtered_df = filtered_df[filtered_df[color_col].isin(color_choice)]

    search_text = st.sidebar.text_input("Search (product name contains)")
    name_col = None
    for candidate in ["productDisplayName", "product_name", "name", "title"]:
        if candidate in filtered_df.columns:
            name_col = candidate
            break

    if search_text and name_col:
        filtered_df = filtered_df[
            filtered_df[name_col].str.contains(search_text, case=False, na=False)
        ]

    if filtered_df.empty:
        st.warning("No products match the current filters.")
        st.stop()

    st.sidebar.markdown("---")
    st.sidebar.write(f"Filtered products: {len(filtered_df)}")

    filtered_indices = filtered_df.index.tolist()
    num_products = len(filtered_indices)

    if num_products == 1:
        st.sidebar.write("Only one product matches the current filters.")
        selected_pos = 0
    else:
        selected_pos = st.sidebar.slider(
            "Select product position",
            min_value=0,
            max_value=num_products - 1,
            value=0,
        )

    row_idx = filtered_indices[selected_pos]
    row = df.loc[row_idx]

    col_img, col_info = st.columns([1, 1])

    with col_img:
        st.subheader("Product Image")
        img_path = get_image_path(row, row_idx, image_dir=IMAGE_DIR)
        if img_path and os.path.exists(img_path):
            image = Image.open(img_path)
            st.image(image, use_container_width=True)
            st.caption(f"Image file: `{os.path.basename(img_path)}`")
        else:
            st.warning("No local image found for this product.")

    with col_info:
        st.subheader("Color Details")

        existing_color = str(row.get(color_col, "N/A"))
        detected_color = str(row.get("detected_color", "N/A"))
        detected_conf = row.get("detected_confidence", None)
        verdict = str(row.get("Verdict", "N/A"))

        st.markdown(
            f"""
            **Existing (catalog) color:** `{existing_color}`  
            **Detected color:** `{detected_color}`  
            **Match status:** `{verdict}`  
            """
        )

        if detected_conf is not None and detected_conf == detected_conf:
            st.markdown(f"**Detected confidence:** `{detected_conf:.3f}`")

        st.markdown("---")
        st.subheader("Metadata")

        meta_cols = [
            c for c in df.columns
            if c not in {color_col, "detected_color", "detected_confidence", "Verdict"}
        ]

        nice_meta = row[meta_cols].to_frame(name="value")
        st.dataframe(nice_meta)


if __name__ == "__main__":
    main()
