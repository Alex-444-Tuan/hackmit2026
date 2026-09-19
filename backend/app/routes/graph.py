from fastapi import APIRouter
from app.models import CamelModel

router = APIRouter()


class GraphData(CamelModel):
    nodes: list[dict] = []
    links: list[dict] = []


@router.get("/graph", response_model=GraphData, response_model_by_alias=True)
def get_graph():
    return GraphData()
