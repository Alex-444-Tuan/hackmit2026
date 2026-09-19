import './pet-window/pet.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import PetRoot from './pet-window/PetRoot'

createRoot(document.getElementById('pet-root') as HTMLElement).render(
  <StrictMode>
    <PetRoot />
  </StrictMode>
)
