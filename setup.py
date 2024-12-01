from setuptools import setup, find_packages

setup(
    name="django_filehub",
    version="0.1.1",
    packages=find_packages(),
    install_requires=[
        "Django>=3.2",
    ],
    classifiers=[
        "Framework :: Django",
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
    ],
    include_package_data=True,
    package_data={
        "django_filehub": [
            "templates/*",
            "static/*",
        ],
    },
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
)
