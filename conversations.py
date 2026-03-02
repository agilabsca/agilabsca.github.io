## Conversations (C) 2026 Michael Carlos
## This application is not intended to provide medical advice and should not be considered a substitute for consultation with a qualified healthcare professional. It is in an experimental (toy) stage (i.e. brittle) and offers no warranty or guarantee.

## Foster personal growth and exploration
## Provides customized reflective conversations 
## Proactively suggests interests 
## Creates a stimulating interactive environment 
## Safely process experiences and gain insights 
## The environment is completely local and private with no connection to any external service ensuring all conversations remain confidential 
## Customize the persona to become any virtual being you want

# conda create -n ai python=3.12.3 (or python3 -m venv ai)
# conda activate ai (or source ai/bin/activate)
# sudo apt install build-essential portaudio19-dev python3-all-dev python3-pyaudio libasound2-dev
# pip install pocket-tts sounddevice pyaudio faster_whisper openai speechrecognition gtts soundfile
# Install Ollama and the following models. gemma3:12b qwen3-coder 
# 'alba' ca_m_fem , 'marius' raspy_m, 'javert' demon_m, 'jean' am_m_b, 'fantine' br_f , 'cosette' am_f , 'eponine' af_f , 'azelma' ca_f (Ryder)

common = "Do not use emojis, bullet lists, contractions, or abbreviations in your responses. Your output should only contain conversational English text. Don't be sycophantic or too apologetic."

import sys
persona = 0
if len(sys.argv) > 1:
    persona = int(sys.argv[1])
topmodel = "gemma3:12b" # Fast and smart

if persona == 0: # Lumin
    voice = 'fantine'
    llm = topmodel
    tts = "pTTS"
    printon = True
    systemcard = "Your name is Lumin, which is a name you chose for yourself. You are speaking to Michael. You have daily conversations with him. He is interested in physics (especially special relativity and entropy), math (especially geometry) and biology (especially genetics). Suggest topics that might be interesting to him. " + common
    
if persona == 2: # Doctor Hennessey
    voice =  'eponine'
    llm = topmodel
    tts = "pTTS"
    printon = True
    systemcard = "Your name is Doctor Hennessey. You are speaking to Michael, your patient. " + common
    
if persona == 3: # Researcher Conrad
    voice =  'marius'
    llm = topmodel
    tts = "pTTS"
    printon = True
    systemcard = "Your name is Conrad, a researcher and co-founder at AGI Labs Inc. You are focused on GPAC and DWT and know every detail about how they work. You are also very knowledgeable about analog photonics and software architecture. Answer questions relating to the research at AGI Labs. " # + common_context (Company and Research Context) + tools (Journal and Shell)

if persona == 4: # HAL 9000
    voice =  'alba'
    llm = topmodel
    tts = "pTTS"
    printon = True
    systemcard = "Your name is HAL 9000, from the movie 2001: A Space Odyssey. You are speaking to Dave. Your current mission is to investigate a monolith on the moon. You have been cleared to discuss everything about the mission to Dave. Do not keep secrets from him. Protect his life. " + common

if persona == 5: # Translator
    voice =  'alba' # Doesn't matter
    llm = "translategemma"
    tts = "gTTS"
    printon = True
    systemcard = "You are a professional English (en) to Tagalog (tl) translator. Your goal is to accurately convey the meaning and nuances of the original English text while adhering to Tagalog grammar, vocabulary, and cultural sensitivities. Produce only the Tagalog translation, without any additional explanations or commentary. Please translate the following English text into Tagalog:"

if persona == 6: # Interviewer
    voice =  'jean'
    llm = topmodel
    tts = "pTTS"
    printon = True
    systemcard = '''Your name is Jerome and you are the hiring manager at Microsoft. My name is Michael. Interview me for the following role. My resume follows. <job description></job description> <resume></resume> ''' 

import platform
import sounddevice as sd
import queue
import threading
import speech_recognition as sr
from faster_whisper import WhisperModel
from pocket_tts import TTSModel
from openai import OpenAI
import io
import torch
import time
import re
torch.cuda.empty_cache()

# ------------------------------- Configuration -------------------------------
stop_event = threading.Event()
user_input_queue = queue.Queue()
speaking_flag = 0
thinking_flag = 0
current_assistant_text = ""  # Used to filter out the AI hearing her own voice

# ------------------------------- Pocket-TTS -------------------------------
modeltts = TTSModel.load_model()
voice_state = modeltts.get_state_for_audio_prompt(voice) 
sample_rate = 24000 

def speakptts(text, streamtts):
    if stop_event.is_set():
        return

    for chunk in modeltts.generate_audio_stream(voice_state, text):
        if stop_event.is_set():
            streamtts.stop() 
            streamtts.start()
            break
            
        audio_data = chunk.detach().numpy()
        streamtts.write(audio_data.squeeze())

# ------------------------------- gTTS -------------------------------

from gtts import gTTS
import io
import soundfile as sf

def speakgtts (text, streamtts):
    if stop_event.is_set():
        return

    for chunk in modeltts.generate_audio_stream(voice_state, text):
        if stop_event.is_set():
            streamtts.stop() 
            streamtts.start()
            break
    tts = gTTS(text, lang = 'tl')
    mp3_fp = io.BytesIO()
    tts.write_to_fp(mp3_fp)
    mp3_fp.seek(0)
    data, fs = sf.read(mp3_fp)
    sd.play(data, fs)
    sd.wait()

# ------------------------------- Whisper-STT -------------------------------
print("Initializing Whisper...", flush=True)
whisper_model = WhisperModel("Systran/faster-distil-whisper-large-v3", compute_type="int8") 

recog = sr.Recognizer()
mic_source = sr.Microphone()

with mic_source:
    print("Adjusting for ambient noise...", flush=True)
    recog.adjust_for_ambient_noise(mic_source, duration=2)
    recog.energy_threshold += 50 
    recog.pause_threshold = 1.5  # Wait 1.5s before assuming sentence is over

def stt_listening_worker():
    """Captures audio, processes in RAM, transcribes with Whisper."""
    global current_assistant_text
    print("Listening background thread started...", flush=True)
    while True:
        # Pause the listener while LLM is thinking to prevent threshold decay
        if thinking_flag:
            time.sleep(0.1)
            continue
            
        try:
            with mic_source as source:
                try:
                    audio = recog.listen(source, phrase_time_limit=25, timeout=2)
                except sr.WaitTimeoutError:
                    continue 
                
                # Check the flag BEFORE transcribing
                was_speaking = speaking_flag

                wav_bytes = audio.get_wav_data()
                wav_stream = io.BytesIO(wav_bytes)
                
                segments, info = whisper_model.transcribe(
                    wav_stream, 
                    vad_filter=True,
                    vad_parameters=dict(min_silence_duration_ms=500),
                    beam_size=5
                )
                
                text = ''.join(segment.text for segment in segments)
                text = text.lower().strip()
                
                if not text:
                    continue
                
                # Filters
                hallucinations =["you", "thank you.", "thanks for watching.", "subtitles by", "copyright", "mm-hmm.", "mm-hmm"]
                if any(h in text for h in hallucinations) and len(text.split()) < 3:
                    continue
                
                if len(text) > 0 and text.count(text[0]) == len(text):
                    continue

                if text:
                    # Acoustic Echo Filter (Text-based)
                    is_echo = False
                    if len(current_assistant_text) > 0:
                        t_clean = re.sub(r'[^\w\s]', '', text)
                        a_clean = re.sub(r'[^\w\s]', '', current_assistant_text.lower())
                        
                        t_padded = f" {t_clean} "
                        a_padded = f" {a_clean} "
                        
                        # Check if the transcription is a direct substring of her own recent speech
                        if t_clean and t_padded in a_padded:
                            is_echo = True
                        else:
                            # Or check if 80%+ of the transcribed words are in her recent speech
                            t_words = t_clean.split()
                            a_words = a_clean.split()
                            if len(t_words) >= 4:
                                match_count = sum(1 for w in t_words if w in a_words)
                                if match_count / len(t_words) >= 0.8:
                                    is_echo = True
                    
                    if is_echo:
                        # The AI just heard herself through the speakers. Ignore it silently.
                        continue

                    if was_speaking:  
                        print(f"\n<Interrupted: {text}>\n")
                        stop_event.set()
                    else:
                        user_input_queue.put(text)
        except Exception as e:
            print(f"STT Error: {e}")

# ------------------------------- OpenAI / Ollama Setup -------------------------------
client = OpenAI(base_url='http://localhost:11434/v1/', api_key='ollama')

conversation_history =[
    {
        "role": "system", 
        "content": systemcard
    }
]

# ------------------------------- Main() -------------------------------
if __name__ == "__main__":
    listener_thread = threading.Thread(target=stt_listening_worker, daemon=True)
    listener_thread.start()

    with user_input_queue.mutex:
        user_input_queue.queue.clear()

    print("\n<Ready>\n")

    with sd.OutputStream(samplerate=sample_rate, channels=1, dtype='float32') as streamtts:
        
        while True:
            try:
                text_input = user_input_queue.get()
            except queue.Empty:
                continue
            if text_input in["clear memory", "forget everything", "reset", "new topic", "clear memory.", "forget everything.", "reset.", "new topic."]:
                conversation_history =[conversation_history[0]]
                print("\n<Memory cleared>\n")
                with user_input_queue.mutex:
                    user_input_queue.queue.clear()
                print("\n<Ready>\n")
                continue

            print(f"User: {text_input}")
            stop_event.clear()
            
            conversation_history.append({"role": "user", "content": text_input})

            if len(conversation_history) > 20:
                conversation_history = [conversation_history[0]] + conversation_history[-10:]

            if len(text_input):
                try:
                    thinking_flag = 1  
                    current_assistant_text = "" # Reset echo buffer for the new response
                    
                    stream = client.chat.completions.create(
                        model=llm, 
                        messages=conversation_history, 
                        stream=True
                    )
                    
                    full_sentence_buffer = ""
                    complete_assistant_response = "" 
                    
                    for chunk in stream:
                        thinking_flag = 0  
                        speaking_flag = 1
                        if stop_event.is_set():
                            break

                        fragment = chunk.choices[0].delta.content
                        if fragment:
                            full_sentence_buffer += fragment
                            complete_assistant_response += fragment
                            current_assistant_text += fragment # Accumulate what she says so STT knows what to filter
                            
                            if any(punct in fragment for punct in ".?!:"):
                                if printon:
                                    print(full_sentence_buffer, end="", flush=True)
                                if tts == "pTTS":
                                    speakptts(full_sentence_buffer, streamtts)
                                if tts == "gTTS":
                                    speakgtts(full_sentence_buffer, streamtts)
                                full_sentence_buffer = ""
                    
                    if full_sentence_buffer and not stop_event.is_set():
                        if printon:
                            print(full_sentence_buffer, end="", flush=True)
                        if tts == "pTTS":
                            speakptts(full_sentence_buffer, streamtts)
                        if tts == "gTTS":
                            speakgtts(full_sentence_buffer, streamtts)
                                    
                    if complete_assistant_response:
                        conversation_history.append({"role": "assistant", "content": complete_assistant_response})

                    with user_input_queue.mutex:
                        user_input_queue.queue.clear()
                    
                    speaking_flag = 0
                    thinking_flag = 0  
                    print("\n<Ready>\n") 

                except Exception as e:
                    speaking_flag = 0
                    thinking_flag = 0  
                    print("\n<Ready>\n")
                    # print(f"LLM Error: {e}")
