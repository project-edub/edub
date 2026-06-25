import type { CurriculumTemplateLesson, LessonItemDto } from '../../types/curriculumTemplate';

interface TemplateLessonEditorProps {
  lessons: CurriculumTemplateLesson[];
  onChange: (lessons: LessonItemDto[]) => void;
  readOnly?: boolean;
}

export default function TemplateLessonEditor({ lessons, onChange, readOnly }: TemplateLessonEditorProps) {
  if (readOnly) {
    return (
      <div>
        {lessons.length === 0 && <p>Chưa có bài học nào.</p>}
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          {lessons.map((l, i) => (
            <li key={l.id || i}>
              {l.chapterName && <strong>{l.chapterName}: </strong>}
              {l.lessonName} ({l.suggestedPeriods} tiết)
            </li>
          ))}
        </ol>
      </div>
    );
  }

  function toLessonItems(list: CurriculumTemplateLesson[]): LessonItemDto[] {
    return list.map((l) => ({ orderIndex: l.orderIndex, chapterName: l.chapterName || undefined, lessonName: l.lessonName, suggestedPeriods: l.suggestedPeriods }));
  }

  function handleChange(index: number, field: keyof CurriculumTemplateLesson, value: string | number) {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value };
    onChange(toLessonItems(updated));
  }

  function handleRemove(index: number) {
    onChange(toLessonItems(lessons.filter((_, i) => i !== index)));
  }

  function handleAdd() {
    onChange([...toLessonItems(lessons), { orderIndex: lessons.length + 1, lessonName: '', suggestedPeriods: 1 }]);
  }

  return (
    <div>
      {lessons.map((l, i) => (
        <div key={l.id || i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={l.chapterName || ''}
            onChange={(e) => handleChange(i, 'chapterName', e.target.value)}
            placeholder="Chương"
            style={{ width: 120, padding: 4 }}
          />
          <input
            type="text"
            value={l.lessonName}
            onChange={(e) => handleChange(i, 'lessonName', e.target.value)}
            placeholder="Tên bài"
            style={{ flex: 1, padding: 4 }}
          />
          <input
            type="number"
            value={l.suggestedPeriods}
            onChange={(e) => handleChange(i, 'suggestedPeriods', Number(e.target.value))}
            min={1}
            style={{ width: 60, padding: 4 }}
          />
          <button type="button" onClick={() => handleRemove(i)}>✕</button>
        </div>
      ))}
      <button type="button" onClick={handleAdd}>+ Thêm bài</button>
    </div>
  );
}
