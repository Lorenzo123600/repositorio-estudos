"""Run with python -m unittest discover -s tests -p 'test_pdf_*.py'."""
import importlib.util
from pathlib import Path
import unittest
import fitz

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('segment', ROOT/'scripts/official-pdf.py')
segment = importlib.util.module_from_spec(spec)
spec.loader.exec_module(segment)


class Boundaries(unittest.TestCase):
    def test_footer_in_other_column_and_below_old_filter(self):
        doc = fitz.open()
        page = doc.new_page(width=600, height=800)
        page.insert_text((30, 785), '1 dia | Caderno 1 | Pagina 2')
        page.draw_line((30, 765), (570, 765), width=1)
        bottom = segment.content_bottom(page, 310, 570)
        self.assertLess(bottom, 764.5)
        self.assertGreater(bottom, 760)

    def test_next_question_rule_excluded_but_diagram_preserved(self):
        doc = fitz.open()
        page = doc.new_page(width=600, height=800)
        page.draw_rect((330, 500, 500, 610))  # E's diagram, with internal whitespace
        page.draw_line((310, 650), (570, 650), width=.5)
        bottom = segment.content_bottom(page, 302, 570, next_header=657)
        self.assertGreater(bottom, 610)
        self.assertLess(bottom, 649.75)
        # A rule inside a diagram, far from the next heading, is not furniture.
        self.assertEqual(segment.content_bottom(page, 302, 570, next_header=700), 699)

    def test_real_2018_footer_rule_and_2017_footer(self):
        for year in (2017, 2018):
            doc = fitz.open(ROOT/f'references/enem-1000/originals/{year}-1-prova.pdf')
            page = doc[1]
            bottom = segment.content_bottom(page, page.rect.width/2, page.rect.width-35)
            footer = next(l for b in page.get_text('dict')['blocks'] for l in b.get('lines', [])
                          if 'Caderno' in ''.join(s['text'] for s in l['spans']))
            self.assertLess(bottom, footer['bbox'][1])
            for x0, x1, y, half in segment.horizontal_rules(page):
                if y > page.rect.height*.9 and x1-x0 > page.rect.width*.7:
                    self.assertLess(bottom, y-half)
            doc.close()

    def test_trailing_rule_and_empty_area_but_not_graph_axis(self):
        doc = fitz.open()
        page = doc.new_page(width=600, height=800)
        page.insert_text((310, 440), 'E alternativa completa')
        page.draw_line((310, 470), (570, 470), width=1)
        self.assertLess(segment.content_bottom(page, 302, 570, option_top=425), 470)
        # Attach an axis to the same line: it now belongs to a diagram.
        page.draw_line((310, 460), (310, 470), width=1)
        self.assertEqual(segment.content_bottom(page, 302, 570, option_top=425), 773)

    def test_2019_inset_dotted_separator_with_crop_padding(self):
        doc = fitz.open(ROOT/'references/enem-1000/originals/2019-1-prova.pdf')
        bottom = segment.content_bottom(doc[1], 22.25359, 282.46451, option_top=659.59973)
        self.assertGreater(bottom, 690)
        self.assertLess(bottom, 699)
        doc.close()


if __name__ == '__main__':
    unittest.main()
