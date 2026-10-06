// Read the actual CSS layout: viewport changes and reduced motion can unpin the story.
export function storyLayout() {
  const story = document.querySelector<HTMLElement>('.story');
  const stage = story?.querySelector<HTMLElement>('.stage');
  if (!story || !stage || getComputedStyle(stage).position !== 'sticky') return null;
  const frames = story.querySelectorAll('.frame').length;
  return { story, stage, step: (story.offsetHeight - stage.offsetHeight) / frames };
}
