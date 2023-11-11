---
layout: post
title:  "Cop personalizado para RuboCop"
date:   2023-11-11 11:30:19 -0300
---

[RuboCop](https://rubocop.org/) es un formateador y verificador de estilos para Ruby. Es una de las gemas más populares, ubicándose entre las 10 gemas más amadas, y también dentro de las 10 más frustrantes, según la [RoR Community Survey 2022](https://rails-hosting.com/2022/#gems-open-source).

En este post mostraré como crear una regla personalizada para RuboCop, también llamadas `Cop` dentro de la jerga de RuboCop.

## Caso de uso

Supongamos que tenemos una aplicación de combates donde usamos el módulo `Fighter` para registrar el nombre y la altura de cada luchador:

```ruby
Fighter.register(name: 'Goku', height: 175)
```

Ahora, por cambios en reglas del torneo, __debemos registrar además el peso__.

El problema es que no podemos llegar y exigir un tercer parámetro `weight`, romperíamos el código en muchos lugares. La alternativa es migrar de forma paulatina y segura en esa dirección; añadiendo el parámetro `weight` cómo *opcional* y usando `RuboCop` para advertir al resto del equipo que desde ahora en adelante es obligatorio indicar el peso.

En otras palabras, queremos que vean esté mensaje:

![Ofensa a nuestro Cop personalizado de RuboCop en VSCode](/assets/2023-11-11-001.png)

## Creando un nuevo Cop

Un Cop es cualquier clase que extienda [`RuboCop::Cop::Cop`](https://www.rubydoc.info/gems/rubocop/RuboCop/Cop/Cop)

```ruby
# lib/rubocop/cop/fighting_app/require_fighter_weight.rb

require 'rubocop'

module RuboCop
  module Cop
    module FightingApp
      class RequireFighterWeight < RuboCop::Cop::Cop
        # TODO
      end
    end
  end
end
```

Podemos ubicarlas donde estimemos conveniente, lo importante es registrarla y habilitarla en el archivo de configuración de rubocop `.rubocop.yml`

```yml
require:
  - ./lib/rubocop/cop/fighting_app/require_fighter_weight.rb

FightingApp/RequireFighterWeight:
  Enbled: true
```

Ahora viene la parte interezante.
### ¿Cómo RuboCop lee nuestro código?

RuboCop usa la librería [`parser`](https://github.com/whitequark/parser) para leer nuestro código y construir un [AST](https://es.wikipedia.org/wiki/%C3%81rbol_de_sintaxis_abstracta) sobre el cual trabajar. Podemos visualizar este AST utilizando el comando `ruby-parse` que viene incluido en la gema:

```bash
$ ruby-parse --legacy -e "Fighter.register(name: 'Goku', height: 175)"
(send
  (const nil :Fighter) :register
  (hash
    (pair
      (sym :name)
      (str "Goku"))
    (pair
      (sym :height)
      (int 175))))
```
(El parámetro `--legacy`es necesario para mostrar una versión del AST compatible con RuboCop.)

Cada *nodo* del árbol tiene un *tipo* y cero o más *hijos*, cada *hijo* puede ser un *nodo* o simplemente un *valor*. En este ejemplo, la *llamada* que hacemos a `Fighter` es representada por un nodo de *tipo* `send` con tres *hijos*: el destinatario de la llamada, el nombre del método, y el hash de *kwargs*.

![AST dibujado en exaclidraw](/assets/2023-11-11-002.png)

Todos los *tipos* y *valores* posibles están documentados [aquí](https://github.com/whitequark/parser/blob/master/doc/AST_FORMAT.md).

RuboCop provee clases y métodos utilitarias para cada *nodo*, podemos verlos todos en la documentación de la gema [`rubocop-ast`](https://www.rubydoc.info/gems/rubocop-ast/RuboCop/AST).

```ruby
irb(main):001> source = RuboCop::ProcessedSource.new(
  "Fighter.register(name: 'Goku', height: 175)",
  RUBY_VERSION.to_f
)
irb(main):002> source.ast
=>
s(:send,
  s(:const, nil, :Fighter), :register,
  s(:hash,
    s(:pair,
      s(:sym, :name),
      s(:str, "Goku")),
    s(:pair,
      s(:sym, :height),
      s(:int, 175))))
irb(main):003> source.ast.class
=> RuboCop::AST::SendNode
irb(main):004> source.ast.descendants.count
=> 8
irb(main):005> source.ast.descendants.second.class
=> RuboCop::AST::HashNode
```

### Identificando ofensas a nuestra regla

Utilizar directamente las clases de `rubocop-ast` funcionaría, pero hay una alternativa más simple. RuboCop ofrece una *feature* llamada [*node pattern*](https://github.com/rubocop/rubocop-ast/blob/master/docs/modules/ROOT/pages/node_pattern.adoc) que nos permite consultar el AST usando un pequeño [DSL](https://es.wikipedia.org/wiki/Lenguaje_espec%C3%ADfico_de_dominio).

Similar a como funcionas las [expresiones regulares](https://es.wikipedia.org/wiki/Expresi%C3%B3n_regular), usamos este DSL para escribir un *patrón* de búsqueda que calce con la parte del árbol que estamos buscando. Podemos usar varios comodines y utilidades para flexibilizar la búsqueda, todas están explicadas con ejemplo en la [documentación](https://github.com/rubocop/rubocop-ast/blob/master/docs/modules/ROOT/pages/node_pattern.adoc#basic-node-pattern-structure).

Existen dos macros para crear método de búsqueda usando este DSL.
- [`def_node_matcher`](https://www.rubydoc.info/gems/rubocop-ast/RuboCop/AST/NodePattern/Macros#def_node_matcher-instance_method): verifica que un nodo cumpla con el patrón
- [`def_node_search`](https://www.rubydoc.info/gems/rubocop-ast/RuboCop/AST/NodePattern/Macros#def_node_search-instance_method): busca recursivamente todos los nodos que cumplan con el patrón


#### Buscando llamados a `register`

Comenzamos buscando los llamados a `register`, para esto usamos un *matcher*:
```ruby
def_node_matcher :fighter_creation?, <<~PATTERN
  (send (const _ :Fighter) :register $...)
PATTERN
```

Esto es equivalente a decir: *debe ser un nodo tipo `send`, su primer hijo debe ser un nodo `const` que tenga como segundo hijo el valor `:Fighter`, el segundo hijo debe ser el valor `:register`, y puede o no tener más hijos*.

Los tres puntos `...` significa "cero o más" y el símbolo `$` es para capturar el valor que encontremos allí. Más adelante nos será de utilidad.

#### Buscando el parámetro `weight`

Para buscar si alguno de los parámetros es `weight` podemos usar un *search*:
```ruby
def_node_search :weight_defined?, <<~PATTERN
  (hash <(pair (sym :weight) _) ...>)
PATTERN
```

Esto es equivalente a decir: *debe ser un nodo tipo `hash`, uno de sus hijos debe ser un nodo `pair` que tenga como primer hijo el nodo `sym` con valor `:weight`, no importa en qué orden aparezca*.

#### Encontrando la ofensa

Estas macros crearán los métodos `fighter_creation?(node)` y `age_defined?(node)` que podemos usar para detectar aquellos lugares donde el peso no está siendo identificado.

```ruby
def fighter_registration_without_weight?(node)
  fighter_creation?(node) do |params|
    params.none? { |param| weight_defined?(param) }
  end
end
```

Gracias al símbolo `$` podemos pasar un bloque a `fighter_creation?` que recibirá lo que sea que atrapó `$`, en este caso sería una lista con el resto de los hijos del nodo `send`, en otras palabras: los parámetros usados para llamar a `Fighter.register`

### Implementando el Cop

Volvemos a nuestro Cop personalizado `RequireFighterWeight`.

Cada vez que RuboCop inicia una nueva investigación, un objeto atraviesa el AST y ejecuta para sobre cada nodo los *call backs* de cada cop registrado. Estos *call backs* son:
- `on_new_investigation`: al iniciar la investigación
- `on_investigation_end`: al terminar la investigación
- `on_#{node_type}`: cada vez que pasamos por un nodo de tipo *node_type*

No colgamos entonces del *call back* `on_send` para implementar nuestra detección de ofensas:

```ruby
# lib/rubocop/cop/fighting_app/require_fighter_weight.rb

require 'rubocop'

module RuboCop
  module Cop
    module FightingApp
      class RequireFighterWeight < RuboCop::Cop::Cop
        MSG = "Must specify the fighter's weight"

        def_node_matcher :fighter_creation?, <<~PATTERN
         (send (const _ :Fighter) :register $...)
        PATTERN

        def_node_search :weight_defined?, <<~PATTERN
          (hash <(pair (sym :weight) _) ...>)
        PATTERN

        def on_send(node)
          return unless fighter_registration_without_weight?(node)

          add_offense(node, message: "Must specify the fighter's weight")
        end

        private

        def fighter_registration_without_weight?(node)
          fighter_creation?(node) do |params|
            params.none? { |param| weight_defined?(param) }
          end
        end
      end
    end
  end
end
```

El método `add_offense` se encargará de delatar a nuestra ofensa y usará por defecto el mensaje definido en la constante `MSG`.

### Resultados

Finalmente, tenemos a RuboCop acusando todos aquellos lugares donde se registran luchados sin indicar el peso.
```bash
$ bundle exec rubocop
...
app/jobs/test_job.rb:10:5: C: FightingApp/RequireFighterWeight: Must specify the fighter's weight
    Fighter.register(name: 'Goku', height: 175)
    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```
Podemos integrar RuboCop con nuestro CI para, por ejemplo, impedir que un *pull request* sea mezclado sin antes haber corregido estos problemas, forzando así la adopción paulatina de la nueva regla.
