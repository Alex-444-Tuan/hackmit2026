def normalize_concept_name(name: str) -> str:
    name = " ".join(name.strip().lower().split())
    words = name.split(" ")
    if words:
        last = words[-1]
        if len(last) > 3 and not last.endswith(("ss", "us", "is")) and last.endswith("s"):
            words[-1] = last[:-1]
    return " ".join(words)
