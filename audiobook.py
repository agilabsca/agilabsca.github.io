# AudioBook (C) 2026 Michael Carlos

# conda create -n pocket-tts python=3.13.11
# conda activate pocket-tts
# pip install sounddevice pocket-tts beautifulsoup4

# 'alba' ca_m_fem , 'marius' raspy_m, 'javert' demon_m, 'jean' am_m_b, 'fantine' br_f , 'cosette' am_f , 'eponine' af_f , 'azelma' ca_f (Ryder)

# Unzip ProjectHailMary.epub.zip
# python audiobook.py Weir_9780593135211_epub3_c021_r1.xhtml

import sounddevice as sd
from pocket_tts import TTSModel
from bs4 import BeautifulSoup
import sys

file_path = sys.argv[1]
content = open(file_path, 'r', encoding='utf-8').read()
soup = BeautifulSoup(content, "html.parser")
for element in soup(["script", "style"]):
    element.decompose()
text = soup.get_text(separator=" ", strip=True)

modeltts = TTSModel.load_model()
voice_state = modeltts.get_state_for_audio_prompt('fantine') 

with sd.OutputStream(samplerate=24000, channels=1, dtype='float32') as streamtts:
    for chunk in modeltts.generate_audio_stream(voice_state, text):
        streamtts.write(chunk.detach().numpy().squeeze())

     
