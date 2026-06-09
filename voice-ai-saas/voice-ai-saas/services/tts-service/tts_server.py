from flask import Flask, request, send_file, jsonify
from TTS.api import TTS
import tempfile, os, logging

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)

# Load Hindi model on startup (downloads ~500MB first time)
tts = TTS('tts_models/hi/fairseq/vits')
logging.info('Coqui TTS model loaded — ready')

@app.route('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'coqui-tts'})

@app.route('/synthesize', methods=['POST'])
def synthesize():
    data = request.get_json()
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'error': 'text required'}), 400

    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        output_path = f.name

    tts.tts_to_file(text=text, file_path=output_path)

    response = send_file(output_path, mimetype='audio/wav', as_attachment=True,
                         download_name='response.wav')
    response.call_on_close(lambda: os.unlink(output_path))
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8082)
