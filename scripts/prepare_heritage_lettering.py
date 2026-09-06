"""Shape Sinhala signage into portable outlines. Requires fonttools and uharfbuzz.
Run once with Python; Blender consumes the committed outline JSON without add-ons.
"""
from pathlib import Path
import io, json
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.basePen import BasePen

ROOT=Path(__file__).parent
font=instantiateVariableFont(TTFont(ROOT/'fonts/NotoSansSinhala.ttf'),{'wght':850,'wdth':75},inplace=False)
stream=io.BytesIO();font.save(stream)
hfont=hb.Font(hb.Face(stream.getvalue()));hfont.scale=(1000,1000)
glyphs=font.getGlyphSet();order=font.getGlyphOrder()
class Outline(BasePen):
    def __init__(self):super().__init__(glyphs);self.paths=[];self.path=[]
    def _moveTo(self,p):self.path=[p]
    def _lineTo(self,p):self.path.append(p)
    def _qCurveToOne(self,b,c):
        a=self._getCurrentPoint()
        for i in range(1,6):
            t=i/5;self.path.append(tuple((1-t)**2*a[j]+2*(1-t)*t*b[j]+t*t*c[j] for j in range(2)))
    def _curveToOne(self,b,c,d):
        a=self._getCurrentPoint()
        for i in range(1,9):
            t=i/8;self.path.append(tuple((1-t)**3*a[j]+3*(1-t)**2*t*b[j]+3*(1-t)*t*t*c[j]+t**3*d[j] for j in range(2)))
    def _closePath(self):self.paths.append(self.path);self.path=[]
    def _endPath(self):self._closePath()
texts=['කොටුව දුම්රිය ස්ථානය','කොළඹ කොටුව','ජාතික කෞතුකාගාරය']
output={}
for text in texts:
    buf=hb.Buffer();buf.add_str(text);buf.guess_segment_properties();hb.shape(hfont,buf)
    assert all(g.codepoint for g in buf.glyph_infos),'Missing Sinhala glyph'
    paths=[];x=y=0
    for g,p in zip(buf.glyph_infos,buf.glyph_positions):
        pen=Outline();glyphs[order[g.codepoint]].draw(pen)
        paths.extend([[[round(xx+x+p.x_offset,3),round(yy+y+p.y_offset,3)] for xx,yy in path] for path in pen.paths]);x+=p.x_advance;y+=p.y_advance
    output[text]={'font':'Noto Sans Sinhala ExtraBold Condensed','glyphCount':len(buf.glyph_infos),'missingGlyphs':0,'advance':x,'contours':paths}
(ROOT/'heritage_lettering.json').write_text(json.dumps(output,ensure_ascii=False,separators=(',',':')))
print({s:len(v['contours']) for s,v in output.items()})
