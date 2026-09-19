from fastapi import APIRouter

router = APIRouter()


@router.post("/notes")
def create_note():
    raise NotImplementedError("Implemented in Task 4")
