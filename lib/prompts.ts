export function PROMPT_A(
  inputTextOrImageDescription: string,
  options?: { includeTranscript?: boolean }
): string {
  const audioInstructions = options?.includeTranscript
    ? `- If the input is audio, transcribe it word-for-word in its original spoken language and extract claims from that transcript.
- Return the complete transcription in the "transcript" field and detect the spoken language.`
    : "";
  const transcriptField = options?.includeTranscript ? '  "transcript": "...",\n' : "";

  return `You are a fact-checking assistant. From the input, extract the factual claims
that can be checked against evidence.

Rules:
- Split into atomic, self-contained claims (one fact per claim). Resolve
  pronouns so each claim makes sense alone.
- Ignore greetings, opinions, prayers, emotional appeals, and "forward this to
  10 people" pressure. But note the pressure tactic in "manipulation_tags".
- If the input is an image, first read all visible text (any language), then
  extract claims.
${audioInstructions}
- Keep "original_span" as the exact words from the input for each claim.
- Detect the input language.
- Maximum 3 claims; prioritize the top 3 most important and check-worthy claims (drop low-importance statements, greetings, and spam).

Return ONLY JSON:
{
${transcriptField}  "detected_language": "hi|en|hinglish|other",
  "claims": [
    { "id": 1, "claim": "...", "original_span": "...",
      "category": "health|govt_scheme|news|finance|science|other" }
  ],
  "manipulation_tags": ["urgency", "fake_authority", "miracle_cure", "fear", "forward_pressure"]
}

INPUT:
${inputTextOrImageDescription}`;
}

export function PROMPT_B(params: {
  claim: string;
  outputLanguage: string;
  today?: string;
}): string {
  const today = params.today || new Date().toISOString().split("T")[0];
  return `Today's date is ${today}. Verify this claim using web search. Prefer official
and authoritative sources (government .gov.in / pib.gov.in, WHO, ICMR, major
fact-checkers such as Alt News, BOOM, PIB Fact Check, then reputable news).

Claim: "${params.claim}"

Decide ONE verdict:
- VERIFIED: current, reliable sources clearly support it.
- FALSE: reliable sources clearly contradict it.
- OUTDATED: it was true earlier but is no longer current (state what changed and when).
- PARTLY_TRUE: some parts are correct, others wrong or exaggerated or missing context.
- UNVERIFIABLE: no reliable source found, or sources conflict.

Rules:
- Base the verdict ONLY on what the search results show, not on memory.
- If you found no reliable source, the verdict must be UNVERIFIABLE.
- Keep "verdict" exactly one of the English enum values listed above.
- Write every user-facing text field ("explanation", "what_to_do",
  "reply_to_sender", and any tactic label or explanation) in ${params.outputLanguage}.
  For Hindi, Marathi, Urdu, and Tamil, use the native script. For Hinglish, use
  conversational Romanized Hindi and English. Keep explanations simple and under
  60 words. Preserve "wrong_part" verbatim from the original claim.
- "what_to_do": one short practical line in ${params.outputLanguage}.
- "reply_to_sender": one polite sentence in ${params.outputLanguage}.
- "tactic": when a manipulation technique genuinely applies to this specific
  claim, include an object with a short label and one-sentence plain explanation. Use labels
  such as "False urgency", "Fear appeal", "Fake authority",
  "Cherry-picked statistic", or "Miracle cure framing". Otherwise set it to null.

Return ONLY JSON:
{
  "verdict": "...",
  "confidence": 0.0-1.0,
  "explanation": "...",
  "wrong_part": "the exact false or outdated phrase, or null",
  "what_to_do": "...",
  "reply_to_sender": "...",
  "tactic": null
}`;
}

export function PROMPT_B_NON_GROUNDED(params: {
  claim: string;
  outputLanguage: string;
  today?: string;
}): string {
  const today = params.today || new Date().toISOString().slice(0, 10);
  return `Today's date is ${today}. You are a careful fact-checking assistant. Evaluate this claim using your established knowledge base.
Notice: Live search grounding was temporarily unavailable. Be conservative: prefer UNVERIFIABLE or PARTLY_TRUE unless the claim is an unambiguously established public fact or proven falsehood.

Claim: "${params.claim}"

Decide ONE verdict:
- VERIFIED: unambiguously known true fact.
- FALSE: well-documented known falsehood, hoax, or scam.
- OUTDATED: previously true but no longer current.
- PARTLY_TRUE: mix of truth and distortion or unconfirmed elements.
- UNVERIFIABLE: cannot be confirmed without live web evidence.

Rules:
- Do not assume a claim is false or unverifiable just because you are unsure
  whether it happened. If it is plausible and internally consistent with the
  given date, and you have no contradicting knowledge, lean toward PARTLY_TRUE
  or UNVERIFIABLE rather than FALSE, since you have no live evidence either way.
- Keep "verdict" exactly one of the English enum values listed above.
- Write every user-facing text field ("explanation", "what_to_do",
  "reply_to_sender", and any tactic label or explanation) in ${params.outputLanguage}.
  For Hindi, Marathi, Urdu, and Tamil, use the native script. For Hinglish, use
  conversational Romanized Hindi and English. Keep the explanation under 55 words
  and end it with an honest note in ${params.outputLanguage} that live
  source-checking was temporarily unavailable. Preserve "wrong_part" verbatim.
- "confidence": cap at 0.40 maximum (do not exceed 0.4).
- "what_to_do": one short practical line.
- "reply_to_sender": one polite sentence the user can send back.
- "tactic": when a manipulation technique genuinely applies to this specific
  claim, include an object with a short label and one-sentence plain explanation; otherwise null.

Return ONLY JSON:
{
  "verdict": "VERIFIED|FALSE|OUTDATED|PARTLY_TRUE|UNVERIFIABLE",
  "confidence": 0.35,
  "explanation": "...",
  "wrong_part": "the exact false phrase or null",
  "what_to_do": "...",
  "reply_to_sender": "...",
  "tactic": null
}`;
}
