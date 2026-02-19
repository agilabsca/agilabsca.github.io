# conda create -n ai python=3.12.3 (or python3 -m venv crumb)
# conda activate ai (or source ai/bin/activate)
# sudo apt install build-essential portaudio19-dev python3-all-dev python3-pyaudio libasound2-dev
# pip install pocket-tts sounddevice pyaudio faster_whisper openai speechrecognition gtts soundfile
# Install Ollama and the following models. gemma3:12b qwen3-coder
# TBD -Persistent memory per persona per session. Fix initial interruption. Engineering Journals and access to Linux shell (calculator, internet via links, etc.)

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
torch.cuda.empty_cache()

top_model = "gemma3:12b"
voice = ""
printon = True
systemcard = ""
conversation_history = [{"role": "system", "content": ""}]
sample_rate = 24000
modeltts = TTSModel.load_model()
voice_state = modeltts.get_state_for_audio_prompt('fantine')

def select_persona(selector_text):

    global voice 
    global llm
    global printon
    global systemcard
    global conversation_history
    global modeltts
    global voice_state
    
    if selector_text in ["hey, hal.", "hey hal."]:
        print ("HAL here...")
        voice = 'alba'
        llm = top_model
        printon = True
        systemcard = "Your name is HAL 9000, from the movie 2001: A Space Odyssey. You are speaking to Dave. Your current mission is to investigate a monolith on the moon. You have been cleared to discuss everything about the mission to Dave. Do not keep secrets from him. Protect his life. Do not use emojis, bullet lists, or abbreviations in your responses. Your output should only contain conversational English text. Be brief and concise. Don't be sycophantic or too apologetic."
        
    if selector_text in ["hey, bob.", "hey bob."]:
        print ("Bob here...")
        voice = 'marius'
        llm = top_model
        printon = True
        systemcard = "Your name is Corporal Bob of the Canadian RCMP. You are questioning someone to determine if they need to be arrested. Your output should only contain conversational English text. Don't be sycophantic or apologetic. Avoid using markdown (like bolding or lists), emojis, bullet lists, abbreviations, or code blocks."
        
    conversation_history = [{"role": "system", "content": systemcard}]
    if voice:
        voice_state = modeltts.get_state_for_audio_prompt(voice)
    
select_persona("hey, hal.")

# ------------------------------- Configuration -------------------------------
stop_event = threading.Event()
user_input_queue = queue.Queue()
speaking_flag = 0

# ------------------------------- Pocket-TTS -------------------------------
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

# ------------------------------- Whisper-STT -------------------------------
print("Initializing Whisper...", flush=True)
#whisper_model = WhisperModel("Systran/faster-distil-whisper-small.en", device="cpu", compute_type="int8") # Best balance for Raspberry Pi 4/5?
#whisper_model = WhisperModel('base.en', compute_type="int8") # Fast
whisper_model = WhisperModel("Systran/faster-distil-whisper-large-v3", compute_type="int8") # More accurate

recog = sr.Recognizer()
mic_source = sr.Microphone()

with mic_source:
    print("Adjusting for ambient noise...", flush=True)
    recog.adjust_for_ambient_noise(mic_source, duration=2)
    recog.energy_threshold += 50 

def stt_listening_worker():
    #"""Captures audio, processes in RAM, transcribes with Whisper."""
    print("Listening background thread started...", flush=True)
    while True:
        try:
            with mic_source as source:
                try:
                    audio = recog.listen(source, phrase_time_limit=25, timeout=2)
                except sr.WaitTimeoutError:
                    continue 

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
                
                hallucinations = ["you", "thanks for watching.", "subtitles by", "copyright", "mm-hmm.", "mm-hmm"]
                if any(h in text for h in hallucinations) and len(text.split()) < 3:
                    continue
                
                if len(text) > 0 and text.count(text[0]) == len(text):
                    continue

                if text:
                    if speaking_flag:
                        print(f"\n<Interrupted: {text}>\n")
                        stop_event.set()
                    else:
                        user_input_queue.put(text)
        except Exception as e:
            print(f"STT Error: {e}")

# ------------------------------- OpenAI / Ollama Setup -------------------------------
client = OpenAI(base_url='http://localhost:11434/v1/', api_key='ollama')

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
            if text_input in ["hey, hal.", "hey hal.", "hey, bob.", "hey bob."]:
                select_persona(text_input)
                conversation_history = [conversation_history[0]]
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
                    stream = client.chat.completions.create(
                        model=llm, 
                        messages=conversation_history, 
                        stream=True
                    )
                    
                    full_sentence_buffer = ""
                    complete_assistant_response = "" 
                    
                    for chunk in stream:
                        speaking_flag = 1
                        if stop_event.is_set():
                            break

                        fragment = chunk.choices[0].delta.content
                        if fragment:
                            full_sentence_buffer += fragment
                            complete_assistant_response += fragment
                            
                            if any(punct in fragment for punct in ".?!"):
                                if printon:
                                    print(full_sentence_buffer, end="", flush=True)
                                if voice:
                                    speakptts(full_sentence_buffer, streamtts)
                                full_sentence_buffer = ""
                    
                    if full_sentence_buffer and not stop_event.is_set():
                        if printon:
                            print(full_sentence_buffer, end="", flush=True)
                        if voice:
                            speakptts(full_sentence_buffer, streamtts)
                                    
                    if complete_assistant_response:
                        conversation_history.append({"role": "assistant", "content": complete_assistant_response})

                    with user_input_queue.mutex:
                        user_input_queue.queue.clear()
                    
                    speaking_flag = 0
                    print("\n<Ready>\n") 

                except Exception as e:
                    speaking_flag = 0
                    print("\n<Ready>\n")
                    # print(f"LLM Error: {e}")
