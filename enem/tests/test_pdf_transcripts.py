import importlib.util
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('transcripts',ROOT/'scripts/recover-pdf-transcripts.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class TranscriptRecovery(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.decoder=module.Decoder(module.imp.read(ROOT/'references/enem-1000/sources.json'))
        catalog=module.imp.read(ROOT/'src/question-catalog.json')
        cls.questions={q['id']:q for q in module.imp.read(ROOT/'src/official-questions.json')}
        for chunk in catalog['chunks']:cls.questions.update({q['id']:q for q in module.imp.read(ROOT/'public'/chunk['file'])})

    @classmethod
    def tearDownClass(cls):
        for doc in cls.decoder.docs.values():doc.close()

    def text(self,id,role):
        q=self.questions[id];asset=next(a for a in q['validation']['assets'] if a['role']==role)
        return self.decoder.extract(q['validation']['statementEvidence'],asset['page']-1,asset['rect'])

    def test_exact_font_outlines_recover_spanish_accents(self):
        text,evidence=self.text('enem-2017-1-espanhol','statement')
        self.assertIn('El carpintero',text);self.assertIn('qué árboles vienen',text)
        self.assertIn('para estudiar los muebles.',text)
        self.assertGreater(evidence['decodedGlyphs'],0)

    def test_overlapping_space_and_letter_do_not_duplicate_the_letter(self):
        text,_=self.text('enem-2017-31','A')
        self.assertIn('nos Jogos Olímpicos',text);self.assertNotIn('nnos',text)

    def test_cff_glyphs_recover_portuguese_without_changing_letters(self):
        text,_=self.text('enem-2021-1-espanhol','A')
        self.assertIn('ressaltar a atração do entrevistado por questões',text)
        self.assertIn('místicas.',text)

    def test_unknown_glyphs_reject_whole_region_instead_of_guessing(self):
        text,evidence=self.text('enem-2022-115','statement')
        self.assertIsNone(text);self.assertIn(evidence['reason'],['unmapped_or_ambiguous_glyph','invalid_character_without_safe_mapping','ambiguous_glyph_position'])


if __name__=='__main__':unittest.main()
