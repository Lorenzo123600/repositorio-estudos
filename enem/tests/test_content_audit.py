import importlib.util
from pathlib import Path
import unittest

from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]


def load(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'scripts'/f'{name}.py')
    module=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


audit=load('audit-question-content')
layout=load('audit-option-layout')


class ContentAudit(unittest.TestCase):
    def test_remove_marker_but_preserve_mathematical_differences(self):
        self.assertEqual(audit.normalized_option('A  2,4 × 10⁻⁵'),audit.normalized_option('E\t2,4 × 10⁻⁵'))
        self.assertNotEqual(audit.normalized_option('A x < y'),audit.normalized_option('B x = y'))
        self.assertNotEqual(audit.normalized_option('A 10⁻⁵'),audit.normalized_option('B 10⁻³'))

    def test_visual_body_ignores_marker_and_whitespace(self):
        a=Image.new('RGB',(100,40),'white');d=ImageDraw.Draw(a);d.rectangle((0,0,5,5),fill='black');d.rectangle((30,10,60,20),fill='black')
        b=Image.new('RGB',(100,50),'white');d=ImageDraw.Draw(b);d.ellipse((0,0,8,8),fill='black');d.rectangle((30,20,60,30),fill='black')
        aa=audit.option_ink(a,15);bb=audit.option_ink(b,15)
        self.assertEqual(aa.tobytes(),bb.tobytes())
        self.assertEqual(audit.visual_similarity(aa,bb),1)
        self.assertIsNone(audit.option_ink(Image.new('L',(50,20),255),10))

    def test_layout_normal_paragraph_is_not_upper_part_of_formula(self):
        rows=[False]*100
        rows[10:25]=[True]*15
        rows[42:50]=[True]*8
        rows[71:80]=[True]*9
        self.assertIsNone(layout.premarker_gaps(rows,70,0))

    def test_layout_finds_formula_starting_above_marker(self):
        rows=[False]*100
        rows[20:30]=[True]*10
        rows[50:80]=[True]*30
        self.assertEqual(layout.premarker_gaps(rows,70,0),(30,50))


if __name__=='__main__':unittest.main()
