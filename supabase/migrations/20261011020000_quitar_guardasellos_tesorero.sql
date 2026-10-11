-- Guardasellos y Tesorería no son puestos necesarios en una tenida: se quitan de la oficialidad.
-- Se renumeran los demás para que el orden quede seguido.
delete from puestos where id in ('guardasellos', 'tesorero');

update puestos set orden = o.orden
from (values
  ('venerable', 1), ('primer-vigilante', 2), ('segundo-vigilante', 3), ('orador', 4),
  ('secretario', 5), ('experto', 6), ('maestro-ceremonias', 7), ('armonia', 8)
) as o (id, orden)
where puestos.id = o.id;
