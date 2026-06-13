import { CATALOG_ID, type A2UISurface } from "@/a2ui/catalog/definitions";

export type A2UIOp = Record<string, unknown> & { version?: string };

/** Map one Echoes surface to A2UI v0.9 ops for AG-UI / submission samples. */
export function surfaceToA2UIOps(
  surface: A2UISurface,
  surfaceId = "patient-step",
): A2UIOp[] {
  const catalogId = surface.catalogId || CATALOG_ID;
  const components = surface.components.map((item) => ({
    id: item.id,
    component: item.component,
    ...("props" in item ? { props: item.props } : {}),
  }));

  return [
    {
      version: "0.9",
      createSurface: { surfaceId, catalogId },
    },
    {
      version: "0.9",
      updateComponents: { surfaceId, components },
    },
  ];
}
