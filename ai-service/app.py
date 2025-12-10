from flask import Flask, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch

app = Flask(__name__)


MODEL_NAME = "Vamsi/T5_Paraphrase_Paws"
device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"Loading AI Model: {MODEL_NAME} on {device}...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME).to(device)
print("✅ Model Loaded Successfully!")

def generate_paraphrase(text):
    input_text = "paraphrase: " + text + " </s>"

    # 1. FIXED: Proper padding logic to prevent 500 Error
    encoding = tokenizer.encode_plus(
        input_text,
        max_length=256,
        padding="max_length", 
        truncation=True,
        return_tensors="pt"
    )

    input_ids = encoding["input_ids"].to(device)
    attention_masks = encoding["attention_mask"].to(device)

    # 2. UPDATED: High Creativity Settings
    outputs = model.generate(
        input_ids=input_ids, 
        attention_mask=attention_masks,
        max_length=256,
        do_sample=True,      # Randomize slightly
        top_k=120,
        top_p=0.98,
        temperature=1.5,     # HIGHER = More creative/different
        early_stopping=True,
        num_return_sequences=1
    )

    result = tokenizer.decode(outputs[0], skip_special_tokens=True, clean_up_tokenization_spaces=True)
    return result

@app.route('/paraphrase', methods=['POST'])
def paraphrase_api():
    data = request.json
    original_text = data.get('text', '')

    if not original_text:
        return jsonify({"error": "No text provided"}), 400

    try:
        new_text = generate_paraphrase(original_text)
        
        # DEBUG: Print to terminal so we can see it working
        print(f"\n🔹 Original: {original_text}")
        print(f"🔸 AI Generated: {new_text}")

        # If AI returns same text, force a flag (Client can decide what to do)
        is_modified = new_text.lower().strip() != original_text.lower().strip()

        return jsonify({
            "paraphrased": new_text, 
            "modified": is_modified
        })

    except Exception as e:
        print(f"❌ Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)