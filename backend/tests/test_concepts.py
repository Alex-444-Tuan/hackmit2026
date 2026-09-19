from app.concepts import normalize_concept_name


def test_normalize_strips_plural_on_last_word_only():
    assert normalize_concept_name("Tangent Lines") == "tangent line"


def test_normalize_keeps_special_endings_intact():
    assert normalize_concept_name("Calculus") == "calculus"
    assert normalize_concept_name("Analysis") == "analysis"
    assert normalize_concept_name("Class") == "class"


def test_canonicalize_reuses_existing_concept_no_duplicate(db_session):
    from app.concepts import canonicalize_note_concepts
    from app.db_models import NoteORM, ConceptORM

    existing = ConceptORM(name="Limits", normalized_name="limit")
    db_session.add(existing)
    db_session.flush()

    note = NoteORM(title="Derivatives", source="screen-capture", raw_content="...")
    db_session.add(note)
    db_session.flush()

    canonicalize_note_concepts(
        db_session,
        note.id,
        [{"concept": "Limits", "leadsTo": ["Derivatives"]}],
    )
    db_session.commit()

    concepts = db_session.query(ConceptORM).filter_by(normalized_name="limit").all()
    assert len(concepts) == 1  # reused, no duplicate


def test_canonicalize_links_every_touched_concept_no_orphans(db_session):
    from app.concepts import canonicalize_note_concepts
    from app.db_models import NoteORM, NoteConceptORM

    note = NoteORM(title="Derivatives", source="screen-capture", raw_content="...")
    db_session.add(note)
    db_session.flush()

    canonicalize_note_concepts(
        db_session,
        note.id,
        [{"concept": "Limits", "leadsTo": ["Derivatives"], "relatedTo": ["Slope"]}],
    )
    db_session.commit()

    linked_note_ids = {nc.note_id for nc in db_session.query(NoteConceptORM).all()}
    assert linked_note_ids == {note.id}
    linked_count = db_session.query(NoteConceptORM).filter_by(note_id=note.id).count()
    assert linked_count == 3  # Limits, Derivatives, Slope — all touched, none orphaned
