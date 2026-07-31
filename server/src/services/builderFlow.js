/**
 * The conversational Agent Builder flow.
 *
 * The sequence of questions is DETERMINISTIC and owned by the backend (this
 * file). Gemini is used only to normalize free-text answers into structured
 * values and to generate the greeting / system prompt — never to decide which
 * question comes next. This keeps the flow robust even if Gemini is unavailable.
 */

export const TOTAL_STEPS = 10;

/**
 * Each step maps to a draft field and describes how the client should render
 * the answer UI (quick replies, text box, voice grid, ...).
 */
export const FLOW = [
  {
    step: 1,
    stepKey: 'agentName',
    field: 'agentName',
    title: 'Agent Identity',
    question: "Let's start with the basics — what would you like to name your voice agent?",
    inputType: 'text',
    placeholder: 'e.g. Emma, Alex, Aria…',
  },
  {
    step: 2,
    stepKey: 'businessName',
    field: 'businessName',
    title: 'Business Name',
    question: 'Great choice! What is the name of your business?',
    inputType: 'text',
    placeholder: 'e.g. Green Valley Real Estate',
  },
  {
    // The options here are a FALLBACK — the controller replaces them with
    // AI-inferred suggestions based on the business name whenever possible.
    step: 3,
    stepKey: 'businessType',
    field: 'businessType',
    title: 'Business Type',
    question: 'What type of business do you run?',
    inputType: 'single',
    allowCustom: true,
    options: [
      { label: 'Real Estate', value: 'Real Estate' },
      { label: 'Dental or Clinic', value: 'Dental or Clinic' },
      { label: 'Restaurant', value: 'Restaurant' },
      { label: 'Coaching', value: 'Coaching' },
      { label: 'E-commerce', value: 'E-commerce' },
      { label: 'Local Service', value: 'Local Service' },
      { label: 'Other', value: '__custom__' },
    ],
  },
  {
    step: 4,
    stepKey: 'businessLocation',
    field: 'businessLocation',
    title: 'Location',
    question:
      'Where is your business based? This helps the agent answer “where are you located?” and set expectations about timings.',
    inputType: 'text',
    placeholder: 'e.g. Jaipur, Rajasthan — or “Online only”',
  },
  {
    step: 5,
    stepKey: 'agentPurpose',
    field: 'agentPurpose',
    title: 'Agent Purpose',
    question: 'What should this agent primarily help callers with?',
    inputType: 'single',
    allowCustom: true,
    options: [
      { label: 'Customer Support', value: 'Customer Support' },
      { label: 'Lead Qualification', value: 'Lead Qualification' },
      { label: 'Appointment Booking', value: 'Appointment Booking' },
      { label: 'Sales Enquiries', value: 'Sales Enquiries' },
      { label: 'General Reception', value: 'General Reception' },
      { label: 'Custom Purpose', value: '__custom__' },
    ],
  },
  {
    step: 6,
    stepKey: 'services',
    field: 'services',
    title: 'Services',
    question:
      'What products or services should the agent know about? List as many as you like — one per line works well.',
    inputType: 'textarea',
    placeholder: 'e.g.\nProperty buying & selling\nRentals\nSite visits & valuations',
  },
  {
    step: 7,
    stepKey: 'tone',
    field: 'tone',
    title: 'Tone',
    question: 'How should the agent communicate? Pick up to three that fit best.',
    inputType: 'multi',
    maxSelections: 3,
    options: [
      { label: 'Friendly', value: 'Friendly' },
      { label: 'Professional', value: 'Professional' },
      { label: 'Warm', value: 'Warm' },
      { label: 'Confident', value: 'Confident' },
      { label: 'Calm', value: 'Calm' },
      { label: 'Energetic', value: 'Energetic' },
    ],
  },
  {
    step: 8,
    stepKey: 'languages',
    field: 'languages',
    title: 'Language',
    question: 'Which language should the agent speak?',
    inputType: 'single',
    allowCustom: true,
    options: [
      { label: 'English', value: 'English' },
      { label: 'Hindi', value: 'Hindi' },
      { label: 'English and Hindi', value: 'English and Hindi' },
      { label: 'Spanish', value: 'Spanish' },
      { label: 'French', value: 'French' },
      { label: 'Custom', value: '__custom__' },
    ],
  },
  {
    step: 9,
    stepKey: 'firstMessage',
    field: 'firstMessage',
    title: 'Greeting',
    question:
      'Now the opening line callers hear first. Would you like me to generate it, or would you prefer to write it yourself?',
    inputType: 'greeting',
    options: [
      { label: 'Generate for me', value: 'generate' },
      { label: 'I will write it', value: 'write' },
    ],
  },
  {
    step: 10,
    stepKey: 'escalationInstructions',
    field: 'escalationInstructions',
    title: 'Human Escalation',
    question: 'What should happen if a caller needs a human?',
    inputType: 'single',
    allowCustom: true,
    options: [
      { label: 'Collect caller details', value: 'Collect the caller name and contact details so the team can follow up.' },
      { label: 'Team will call back', value: 'Let the caller know a team member will call them back shortly.' },
      { label: 'Provide a phone number', value: 'Share the main business phone number so the caller can reach a person directly.' },
      { label: 'End politely', value: 'Politely wrap up the call and suggest they try again during business hours.' },
      { label: 'Custom instruction', value: '__custom__' },
    ],
  },
];

export const STEP_BY_NUMBER = new Map(FLOW.map((s) => [s.step, s]));
export const STEP_BY_KEY = new Map(FLOW.map((s) => [s.stepKey, s]));

export function getStep(stepNumber) {
  return STEP_BY_NUMBER.get(stepNumber) || null;
}

/** Fields required before an agent can be created. */
export const REQUIRED_FIELDS = [
  'agentName',
  'businessName',
  'businessType',
  'agentPurpose',
  'firstMessage',
  'languages',
  'tone',
];

/** Compute how "complete" the draft profile is (used by the live preview). */
export function computeCompletion(draft) {
  const checks = [
    Boolean(draft.agentName),
    Boolean(draft.businessName),
    Boolean(draft.businessType),
    Boolean(draft.businessLocation),
    Boolean(draft.agentPurpose),
    Array.isArray(draft.services) && draft.services.length > 0,
    Array.isArray(draft.tone) && draft.tone.length > 0,
    Array.isArray(draft.languages) && draft.languages.length > 0,
    Boolean(draft.firstMessage),
    Boolean(draft.escalationInstructions),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

/** Whether every required field is present so the draft can be reviewed/created. */
export function isReadyForReview(draft) {
  return REQUIRED_FIELDS.every((f) => {
    const v = draft[f];
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  }) && Boolean(draft.selectedVoiceId);
}

/**
 * Pick the voice that best fits the draft — the user is never asked to choose
 * one during setup. Language wins first (an Indian-accent voice for Hindi),
 * then tone. Callers can still change it later from Edit Agent.
 */
export function pickVoiceForDraft(draft, voices) {
  if (!Array.isArray(voices) || voices.length === 0) return null;
  const byId = (id) => voices.find((v) => v.id === id);

  const langs = (draft.languages || []).map((l) => String(l).toLowerCase());
  const tone = (draft.tone || []).map((t) => String(t).toLowerCase());
  const speaksHindi = langs.some((l) => l.includes('hindi'));

  let preferred;
  if (speaksHindi) {
    preferred = tone.includes('energetic') || tone.includes('confident') ? 'rohan' : 'naina';
  } else if (tone.includes('confident') || tone.includes('professional')) {
    preferred = 'savannah';
  } else if (tone.includes('energetic')) {
    preferred = 'rohan';
  } else {
    preferred = 'elliot'; // warm, friendly default
  }

  return byId(preferred) || byId('elliot') || voices[0];
}

/** Split a free-text services answer into a clean array. */
export function normalizeServices(text) {
  if (Array.isArray(text)) return text.map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
  return String(text || '')
    .split(/\r?\n|,|;|•|•/)
    .map((s) => s.replace(/^[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 30);
}

/**
 * Whether a step's answer is already present on the draft.
 *
 * Used to auto-skip steps that were pre-filled out-of-band (e.g. from a
 * Quick-start template on the welcome screen) so the guided chat never
 * re-asks details the user has effectively already provided.
 */
export function isStepAnswered(draft, step) {
  if (!draft || !step) return false;
  switch (step.stepKey) {
    case 'voice':
      return Boolean(draft.selectedVoiceId);
    case 'firstMessage':
      return Boolean(draft.firstMessage);
    default: {
      const value = draft[step.field];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    }
  }
}

/** Build the assistant-facing UI payload for a given step. */
export function stepUi(step) {
  const s = typeof step === 'number' ? getStep(step) : step;
  if (!s) return null;
  return {
    step: s.step,
    stepKey: s.stepKey,
    field: s.field,
    title: s.title,
    question: s.question || '',
    inputType: s.inputType,
    options: s.options || null,
    maxSelections: s.maxSelections || null,
    allowCustom: Boolean(s.allowCustom),
    placeholder: s.placeholder || null,
  };
}

/** Progress metadata for the builder header + progress bar. */
export function progressFor(draft) {
  const current = Math.min(draft.currentStep, TOTAL_STEPS + 1);
  const reviewing = current > TOTAL_STEPS;
  const step = reviewing ? null : getStep(current);
  return {
    currentStep: current,
    totalSteps: TOTAL_STEPS,
    stepTitle: reviewing ? 'Review' : step?.title || '',
    completionPercentage: draft.completionPercentage,
    isComplete: reviewing || isReadyForReview(draft),
  };
}
