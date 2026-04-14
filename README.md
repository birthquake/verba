# Verba

**Real-time voice translation for healthcare.**

Verba is a web-based conversation tool designed for bedside use in clinical settings. It enables fluid, two-way spoken communication between healthcare workers and patients who speak different languages — without requiring an interpreter to be present.

---

## The problem

Language barriers in healthcare lead to delayed diagnoses, misunderstood instructions, and poorer patient outcomes. Generic translation apps like Google Translate and Apple Translate exist, but they are built for tourists — not clinical environments. They require manual mode switching, have no medical context awareness, and were not designed to sit between two people having a real conversation.

---

## What Verba does

- Listens to either speaker continuously
- Detects the language being spoken automatically
- Translates and speaks the response aloud in the other language
- Maintains a full bilingual transcript of the session
- Presents a clean two-sided interface designed for a shared screen

---

## MVP languages

- English
- Spanish

Additional languages are planned for future releases.

---

## Tech stack

- React (web app)
- OpenAI Whisper (speech-to-text)
- Google Translate API (translation)
- Web Speech API (text-to-speech)
- Firebase (session storage)
- Vercel (deployment)

---

## Status

Currently in active development. MVP in progress.

---

## Future roadmap

- Additional language support
- Medical phrase shortcuts (pain scale, allergies, consent, medication instructions)
- ASL visual translation
- HIPAA compliance layer
- EHR session export
