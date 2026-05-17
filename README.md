# Verba

**Real-time voice translation for healthcare.**

Verba is a web-based clinical communication tool designed for bedside use. It enables fluid, two-way spoken conversation between healthcare providers and patients who speak different languages — without requiring a professional interpreter to be present.

-----

## The Problem

Language barriers in healthcare lead to delayed diagnoses, misunderstood instructions, medication errors, and poorer patient outcomes. Generic translation apps like Google Translate and Apple Translate were built for tourists — not clinical environments. They require manual mode switching, have no medical context awareness, and were not designed to sit between two people in a real appointment.

-----

## What Verba Does

- Listens to both speakers and translates in real time
- Speaks translations aloud in the appropriate language
- Maintains a full bilingual transcript of every session
- Adapts translation context to the clinical specialty (Emergency, Maternity, Pediatrics, Cardiology, Surgery)
- Presents a clean two-sided interface designed for a shared screen or two separate devices

-----

## Features

**Live Translation**
Two-way real-time voice translation powered by OpenAI Whisper (speech-to-text) and GPT-4o with medical context prompting.

**Clinical Specialty Modes**
Translation prompts are tuned for five specialties: General, Emergency, Maternity, Pediatrics, Cardiology, and Surgery — ensuring terminology and tone are appropriate for the encounter type.

**Medical Phrase Library**
Pre-built, pre-translated phrases across common clinical categories including pain assessment, breathing, dizziness, allergies, and consent — available instantly without typing.

**Medication Instructions**
Providers can type or dictate medication instructions; Verba translates and displays them clearly for the patient to read and hear.

**Discharge Instructions**
Structured discharge planning across five categories: diet, medications, activity, follow-up, and warnings — all translatable and speakable.

**Vital Signs Display**
Providers enter vitals (blood pressure, heart rate, temperature, O2 saturation); Verba displays them to the patient in their language with spoken readout.

**Pain Scale**
Visual 1–10 pain scale presented in the patient’s language for quick, accurate self-reporting.

**Two-Device Mode**
Provider and patient can each use their own phone. A session code connects the two devices in real time via Ably, removing the need for a shared tablet.

**Patient Onboarding**
First-time patients see a brief welcome screen in their language explaining how the app works and that the conversation is private.

**Panic / Help Alert**
A persistent “I need help” button in the patient’s language triggers an immediate alert for staff.

**Session Summary**
AI-generated clinical summary of each session, copyable for documentation.

**Transcript Export**
Full bilingual transcript exportable via copy or share at the end of any session.

**Offline Mode**
Graceful fallback to pre-translated phrase library when internet connectivity is unavailable.

-----

## Supported Languages

Arabic, Bulgarian, Cantonese, Croatian, Czech, Danish, Dutch, Finnish, French, German, Greek, Hindi, Hungarian, Italian, Korean, Mandarin, Norwegian, Persian, Polish, Portuguese, Romanian, Russian, Slovak, Spanish, Swedish, Turkish, Ukrainian, Vietnamese — plus English on the provider side.

-----

## Tech Stack

- **React** — web application
- **OpenAI Whisper** — speech-to-text
- **GPT-4o** — medical-context translation
- **Web Speech API** — text-to-speech
- **Ably** — real-time two-device sync
- **Firebase** — planned for session logging and audit trail (HIPAA compliance roadmap)
- **Vercel** — deployment

-----

## Status

Live MVP. Actively seeking clinical pilot partners and pre-seed funding to build native iOS and Android versions.

-----

## Roadmap

- Native iOS and Android apps
- HIPAA compliance layer
- EHR integration and session export
- ASL visual translation support
- Expanded language coverage
- Admin dashboard for clinical organizations

-----

## Contact

For pilot partnership or funding inquiries, please reach out via [GitHub Issues](../../issues) or the contact information on file.