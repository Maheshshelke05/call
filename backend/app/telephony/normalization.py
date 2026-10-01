import re
from typing import Optional, Tuple

def normalize_indian_phone(phone: str) -> Tuple[Optional[str], bool, str]:
    """
    Normalizes phone number to E.164 format for India (+91XXXXXXXXXX).
    Returns:
        (normalized_phone, is_valid, error_reason)
    """
    if not phone or not isinstance(phone, str):
        return None, False, "Empty or non-string phone number"

    # Remove all whitespace, dashes, parentheses, dots
    cleaned = re.sub(r"[\s\-\(\)\.]+", "", phone.strip())

    # Check for leading +
    has_plus = cleaned.startswith("+")
    digits_only = re.sub(r"[^\d]", "", cleaned)

    if not digits_only:
        return None, False, "No digits found in phone number"

    # Case 1: Starts with country code 91
    if digits_only.startswith("91") and len(digits_only) == 12:
        mobile_part = digits_only[2:]
    # Case 2: Starts with 0 (e.g. 09876543210)
    elif digits_only.startswith("0") and len(digits_only) == 11:
        mobile_part = digits_only[1:]
    # Case 3: Exactly 10 digits
    elif len(digits_only) == 10:
        mobile_part = digits_only
    # International or non-standard format
    elif has_plus and len(digits_only) >= 10 and len(digits_only) <= 15:
        return f"+{digits_only}", True, ""
    else:
        return None, False, f"Invalid length ({len(digits_only)} digits); expected 10-digit Indian mobile number"

    # Indian mobile numbers typically begin with 6, 7, 8, or 9
    if not re.match(r"^[6-9]\d{9}$", mobile_part):
        return None, False, f"Invalid Indian mobile prefix '{mobile_part[0]}'; mobile numbers start with 6, 7, 8, or 9"

    normalized = f"+91{mobile_part}"
    return normalized, True, ""
