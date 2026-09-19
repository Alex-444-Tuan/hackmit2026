from app.db_models import ConceptORM, NoteConceptORM, ConceptLinkORM


def normalize_concept_name(name: str) -> str:
    name = " ".join(name.strip().lower().split())
    words = name.split(" ")
    if words:
        last = words[-1]
        if len(last) > 3 and not last.endswith(("ss", "us", "is")) and last.endswith("s"):
            words[-1] = last[:-1]
    return " ".join(words)


def get_or_create_concept(db, name: str) -> ConceptORM:
    normalized = normalize_concept_name(name)
    existing = db.query(ConceptORM).filter_by(normalized_name=normalized).first()
    if existing:
        return existing
    concept = ConceptORM(name=name, normalized_name=normalized)
    db.add(concept)
    db.flush()
    return concept


def canonicalize_note_concepts(db, note_id: str, flowchart: list[dict]) -> None:
    """Links every concept touched by flowchart[].concept/leadsTo/relatedTo to
    note_id, and stores deduplicated concept_links, dropping self-links. This
    is what keeps the graph merging into shared hubs instead of fragmenting
    into per-note duplicates (CLAUDE.md's canonicalization contract)."""
    touched_names: set[str] = set()
    for edge in flowchart:
        touched_names.add(edge["concept"])
        touched_names.update(edge.get("leadsTo", []))
        touched_names.update(edge.get("relatedTo", []))

    for name in touched_names:
        concept = get_or_create_concept(db, name)
        db.add(NoteConceptORM(note_id=note_id, concept_id=concept.id))

    for edge in flowchart:
        from_concept = get_or_create_concept(db, edge["concept"])
        for kind, targets in (("leads-to", edge.get("leadsTo", [])), ("related-to", edge.get("relatedTo", []))):
            for target_name in targets:
                to_concept = get_or_create_concept(db, target_name)
                if from_concept.id == to_concept.id:
                    continue
                exists = (
                    db.query(ConceptLinkORM)
                    .filter_by(from_concept_id=from_concept.id, to_concept_id=to_concept.id, kind=kind)
                    .first()
                )
                if not exists:
                    db.add(ConceptLinkORM(from_concept_id=from_concept.id, to_concept_id=to_concept.id, kind=kind))
