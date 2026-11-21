// React components that can be placed inside the HTML of a chapter:
//
//   <div data-widget="Quiz" data-props='{"question":"..."}'></div>
//
// Add the component here under the same name and it is rendered in that place
// (see ContentView.jsx).
import SelfHealing from './SelfHealing.jsx';
import ChapterMap from './ChapterMap.jsx';
import MyProgress from './MyProgress.jsx';
import Syllabus from './Syllabus.jsx';

export default { SelfHealing, Syllabus, MyProgress, ChapterMap };
