from ursina import *
from random import randint
import time as sys_time

app = Ursina()

# Configure window
window.title = '3D F1 Racer'
window.borderless = False
window.fullscreen = False

# Player vehicle
player = Entity(
    model='cube',
    color=color.blue,
    scale=(2, 1, 3),
    position=(0, 0.5, -20),
    collider='box'
)

# Racing track
track = Entity(
    model='plane',
    texture='white_cube',
    scale=(20, 1, 100),
    texture_scale=(10, 50),
    position=(0, 0, 0)
)

# Road markings
for z in range(-50, 100, 5):
    Entity(
        model='cube',
        color=color.yellow,
        scale=(0.1, 0.1, 3),
        position=(0, 0.1, z)
    )

# AI opponents
ai_cars = []
spawn_delay = 2
last_spawn = 0

def create_ai_car():
    ai = Entity(
        model='cube',
        color=color.red,
        scale=(2, 1, 3),
        position=(randint(-8, 8), 0.5, 50),
        collider='box'
    )
    ai_cars.append(ai)

# View setup
camera.position = (0, 20, -40)
camera.look_at(player.position)

# Game state
score = 0
score_display = Text(text='Score: 0', position=(-0.8, 0.45))
game_active = True

def update():
    global last_spawn, score, game_active
    
    if not game_active:
        return

    # Player controls
    player.x += held_keys['d'] * time.dt * 10
    player.x -= held_keys['a'] * time.dt * 10
    player.x = max(-14, min(14, player.x))

    # AI movement
    for opponent in ai_cars:
        opponent.z -= time.dt * 15  # AI speed
        if opponent.z < -50:
            ai_cars.remove(opponent)
            destroy(opponent)
    
    # Spawn AI periodically
    if sys_time.time() - last_spawn > spawn_delay:
        create_ai_car()
        last_spawn = sys_time.time()

    # Update score
    score += time.dt
    score_display.text = f'Score: {int(score)}'

    # Collision check
    for opponent in ai_cars:
        if opponent.intersects(player).hit:
            Text(text='CRASH! GAME OVER', origin=(0,0), scale=2, color=color.red)
            game_active = False

app.run()