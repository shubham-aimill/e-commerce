from typing import Literal

from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate


Verdict = Literal["Match", "Mismatch"]


class ColorMatchAgent:
    """
    LangChain-based agent that decides if a detected color matches
    the catalog color.

    This uses an OpenAI model via LangChain and applies catalog rules such as:
    - "sky blue" is a shade of "blue" -> Match
    - "navy" vs. "blue" -> Match
    - "cream" vs. "white" -> Match
    - "red" vs. "green" -> Mismatch
    """

    def __init__(self, openai_api_key: str, model_name: str = "gpt-4o-mini") -> None:
        """
        Initialize the agent.

        Parameters
        ----------
        openai_api_key : str
            OpenAI API key.
        model_name : str
            Name of OpenAI chat model to use.
        """
        # ChatOpenAI will also read OPENAI_API_KEY from environment,
        # but we pass it explicitly for clarity.
        self.llm = ChatOpenAI(
            model=model_name,
            temperature=0,
            openai_api_key=openai_api_key,
        )
        self._chain = self._build_chain()

    def _build_chain(self):
        """Build the LangChain pipeline that returns "Match" or "Mismatch"""
        template = ChatPromptTemplate.from_template(
            """
You are an ecommerce color matching expert.

Catalog (expected) color: "{expected_color}"
Detected color from image model: "{detected_color}"

Decide whether a typical shopper would consider these the SAME color
(for example, "sky blue" is a shade of "blue", "navy" is also "blue",
"off white" is "white", "navy blue" is "dark blue", etc.).

Respond with exactly ONE word:
- "Match"  if they are similar color or shade.
- "Mismatch" if they are different.

Do not add any explanation or punctuation. Just return Match or Mismatch.
            """.strip()
        )
        parser = StrOutputParser()
        return template | self.llm | parser

    def get_verdict(self, expected_color: str, detected_color: str) -> Verdict:
        """
        Determine whether the detected color matches the expected catalog color.

        Parameters
        ----------
        expected_color : str
            Color from the dataset.
        detected_color : str
            Color predicted by CLIP.

        Returns
        -------
        Verdict
            "Match" or "Mismatch".
        """
        raw = self._chain.invoke(
            {
                "expected_color": expected_color.strip(),
                "detected_color": detected_color.strip(),
            }
        )
        # Normalize to exactly "Match" or "Mismatch".
        normalized = raw.strip().lower()
        if "match" in normalized and "mis" not in normalized:
            return "Match"
        if "mismatch" in normalized:
            return "Mismatch"
        # Fallback: be conservative and mark as mismatch
        return "Mismatch"
