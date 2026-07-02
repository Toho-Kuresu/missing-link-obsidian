import { QuartzFilterPlugin } from "../types"

// Folder/section index pages are navigation scaffolding, not lore notes —
// they never carry `edit: edited` and must stay published regardless.
function isIndexPage(slug: string | undefined): boolean {
  return slug === "index" || slug?.endsWith("/index") === true
}

export const RequireEdited: QuartzFilterPlugin<{}> = () => ({
  name: "RequireEdited",
  shouldPublish(_ctx, [_tree, vfile]) {
    if (isIndexPage(vfile.data?.slug)) {
      return true
    }
    return vfile.data?.frontmatter?.edit === "edited"
  },
})
