# Product Color Mismatch Detector

Use case: **Product Color Mismatch Identification**

This project:
1. Loads an e-commerce product dataset (like `products_asos.csv`).
2. Fetches product images from the `images` column (ASOS style: list of URLs as a string).
3. Uses **OpenAI CLIP** (via `transformers`) to detect the dominant color of each product image.
4. Uses a **LangChain agent** (OpenAI model) to decide if the detected color matches the catalog color.
5. Writes a new CSV with:
   - `detected_color`
   - `detected_confidence`
   - `verdict` (either `Match` or `Mismatch`)

Example:
- Detected Color: `Sky Blue`
- Expected Color: `blue`
- Verdict: `Match`

## Setup

```bash
git clone <your-repo-url>
cd product-color-mismatch-detector

python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

pip install -r requirements.txt
```

Create and edit `config.yml`:

```yaml
openai_api_key: "YOUR_OPENAI_API_KEY_HERE"
device: "cpu"  # or "cuda"
```

Place your dataset:

```text
data/products_asos.csv
```


## Run

```bash
python main.py       --input-csv data/products_asos.csv       --output-csv data/products_asos_with_verdict.csv       --limit 500
```

- `--limit` is optional; it processes only the first N rows for quick tests.

The resulting CSV will have an extra `detected_color`, `detected_confidence`, and `Verdict` column.
