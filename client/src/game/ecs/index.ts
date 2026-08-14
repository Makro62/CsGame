/**
 * ECS (Entity Component System) Architecture
 * Based on patterns from three-fps and Enari Engine
 *
 * Provides modular game object composition with lifecycle hooks.
 */

// ─── Component Base ─────────────────────────────────────────────
export abstract class Component {
  public entity: Entity | null = null

  setParent(entity: Entity) {
    this.entity = entity
  }

  getComponent<T extends Component>(type: new (...args: any[]) => T): T | undefined {
    return this.entity?.getComponent(type)
  }

  /** Called once after all entities are registered */
  initialize() {}

  /** Called every frame with delta time */
  update(_dt: number) {}

  /** Called at fixed physics rate */
  physicsUpdate(_dt: number) {}

  /** Called when component is removed */
  destroy() {}
}

// ─── Entity ─────────────────────────────────────────────────────
export class Entity {
  public id: number = 0
  public name: string = ''
  public active: boolean = true
  public components: Map<Function, Component> = new Map()
  public parent: Entity | null = null
  public children: Entity[] = []

  // Event bus for intra-entity communication
  private eventHandlers: Map<string, Function[]> = new Map()

  addComponent<T extends Component>(component: T): this {
    component.setParent(this)
    this.components.set(component.constructor, component)
    return this
  }

  getComponent<T extends Component>(type: new (...args: any[]) => T): T | undefined {
    return this.components.get(type) as T | undefined
  }

  hasComponent(type: Function): boolean {
    return this.components.has(type)
  }

  removeComponent(type: Function): void {
    const component = this.components.get(type)
    if (component) {
      component.destroy()
      this.components.delete(type)
    }
  }

  addChild(entity: Entity) {
    entity.parent = this
    this.children.push(entity)
  }

  removeChild(entity: Entity) {
    entity.parent = null
    this.children = this.children.filter(c => c !== entity)
  }

  // Event bus
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      this.eventHandlers.set(event, handlers.filter(h => h !== handler))
    }
  }

  emit(event: string, ...args: any[]) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(...args))
    }
  }

  initialize() {
    this.components.forEach(component => component.initialize())
  }

  update(dt: number) {
    if (!this.active) return
    this.components.forEach(component => component.update(dt))
  }

  physicsUpdate(dt: number) {
    if (!this.active) return
    this.components.forEach(component => component.physicsUpdate(dt))
  }

  destroy() {
    this.components.forEach(component => component.destroy())
    this.components.clear()
    this.children.forEach(child => child.destroy())
    this.children = []
  }
}

// ─── EntityManager ──────────────────────────────────────────────
export class EntityManager {
  private entities: Entity[] = []
  private nextId: number = 0

  add(entity: Entity): Entity {
    entity.id = this.nextId++
    this.entities.push(entity)
    return entity
  }

  remove(entity: Entity) {
    entity.destroy()
    this.entities = this.entities.filter(e => e !== entity)
  }

  /** Call after all entities are added to initialize components */
  endSetup() {
    this.entities.forEach(entity => entity.initialize())
  }

  update(dt: number) {
    for (const entity of this.entities) {
      entity.update(dt)
    }
  }

  physicsUpdate(dt: number) {
    for (const entity of this.entities) {
      entity.physicsUpdate(dt)
    }
  }

  getById(id: number): Entity | undefined {
    return this.entities.find(e => e.id === id)
  }

  getByName(name: string): Entity | undefined {
    return this.entities.find(e => e.name === name)
  }

  getAll(): Entity[] {
    return this.entities
  }

  clear() {
    this.entities.forEach(entity => entity.destroy())
    this.entities = []
  }
}

// ─── System Base ────────────────────────────────────────────────
export abstract class System {
  public manager: EntityManager | null = null

  setManager(manager: EntityManager) {
    this.manager = manager
  }

  /** Called once when system is initialized */
  initialize() {}

  /** Called every frame */
  abstract update(dt: number): void

  /** Called at fixed physics rate */
  physicsUpdate(_dt: number) {}

  /** Called when system is destroyed */
  destroy() {}
}

// ─── SystemManager ──────────────────────────────────────────────
export class SystemManager {
  private systems: System[] = []
  private entityManager: EntityManager

  constructor(entityManager: EntityManager) {
    this.entityManager = entityManager
  }

  addSystem(system: System): this {
    system.setManager(this.entityManager)
    this.systems.push(system)
    return this
  }

  removeSystem(system: System) {
    system.destroy()
    this.systems = this.systems.filter(s => s !== system)
  }

  initialize() {
    this.systems.forEach(system => system.initialize())
  }

  update(dt: number) {
    for (const system of this.systems) {
      system.update(dt)
    }
  }

  physicsUpdate(dt: number) {
    for (const system of this.systems) {
      system.physicsUpdate(dt)
    }
  }
}

// ─── Common Components ──────────────────────────────────────────

export class TransformComponent extends Component {
  x: number = 0
  y: number = 0
  z: number = 0
  rotationX: number = 0
  rotationY: number = 0
  rotationZ: number = 0
  scaleX: number = 1
  scaleY: number = 1
  scaleZ: number = 1

  setPosition(x: number, y: number, z: number) {
    this.x = x
    this.y = y
    this.z = z
  }

  setRotation(x: number, y: number, z: number) {
    this.rotationX = x
    this.rotationY = y
    this.rotationZ = z
  }
}

export class HealthComponent extends Component {
  hp: number = 100
  maxHp: number = 100
  isDead: boolean = false

  takeDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount)
    this.isDead = this.hp <= 0
    this.entity?.emit('damage', amount, this.hp)
    if (this.isDead) {
      this.entity?.emit('death')
    }
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount)
    this.entity?.emit('heal', amount, this.hp)
  }

  reset() {
    this.hp = this.maxHp
    this.isDead = false
  }
}

export class VelocityComponent extends Component {
  x: number = 0
  y: number = 0
  z: number = 0

  set(x: number, y: number, z: number) {
    this.x = x
    this.y = y
    this.z = z
  }

  add(x: number, y: number, z: number) {
    this.x += x
    this.y += y
    this.z += z
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
  }

  lengthXZ(): number {
    return Math.sqrt(this.x * this.x + this.z * this.z)
  }

  normalize() {
    const len = this.length()
    if (len > 0) {
      this.x /= len
      this.y /= len
      this.z /= len
    }
  }
}
